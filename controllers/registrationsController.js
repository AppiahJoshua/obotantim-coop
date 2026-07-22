const pool = require('../config/database');
const auditLog = require('../utils/auditLog');

// ── Helper Function: Sanitize and Validate Date of Birth ───────
const sanitizeDob = (dobValue) => {
  if (!dobValue) return null;
  
  try {
    let dateStr = '';
    if (typeof dobValue === 'string') {
      dateStr = dobValue.trim();
    } else if (dobValue instanceof Date) {
      dateStr = dobValue.toISOString();
    } else {
      dateStr = String(dobValue).trim();
    }

    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const currentYear = new Date().getFullYear();
      if (year >= 1900 && year <= currentYear) {
        return `${match[1]}-${match[2]}-${match[3]}`;
      }
    }

    const parsedDate = new Date(dobValue);
    if (!isNaN(parsedDate.getTime())) {
      const year = parsedDate.getFullYear();
      const currentYear = new Date().getFullYear();
      if (year >= 1900 && year <= currentYear) {
        const iso = parsedDate.toISOString();
        return iso.substring(0, 10);
      }
    }
  } catch (e) {
    // Fall back safely if any parsing exception occurs
  }
  
  return '1990-01-01';
};

// ── POST /api/registrations (public submission) ───────────────
const submit = async (req, res, next) => {
  try {
    // 1. Destructured 'gender' from req.body
    const {
      full_name, phone, gender, email, date_of_birth, ghana_card, occupation,
      address, service_type, loan_amount, notes,
    } = req.body;

    if (!full_name || !phone || !service_type) {
      return res.status(400).json({
        error: 'Full name, phone, and service type are required.',
      });
    }

    const validServices = ['loan', 'savings', 'membership'];
    if (!validServices.includes(service_type)) {
      return res.status(400).json({ error: 'Invalid service type.' });
    }

    const photo_url         = req.file ? req.file.path    : null;
    const photo_public_id   = req.file ? req.file.filename : null;
    const sanitizedDob      = sanitizeDob(date_of_birth);
    
    // Validate or default gender values if needed
    const validGenders = ['Male', 'Female', 'Other'];
    const sanitizedGender = validGenders.includes(gender) ? gender : (gender || null);

    // 2. Added 'gender' into the INSERT statement columns and parameters
    const [result] = await pool.query(
      `INSERT INTO registrations
         (full_name, phone, gender, email, date_of_birth, ghana_card, occupation, address,
          service_type, loan_amount, notes, photo_url, photo_public_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        full_name, 
        phone, 
        sanitizedGender, 
        email || null, 
        sanitizedDob, 
        ghana_card || null, 
        occupation || null, 
        address || null,
        service_type, 
        loan_amount || null, 
        notes || null, 
        photo_url, 
        photo_public_id,
      ]
    );

    const [newRows] = await pool.query(
      'SELECT id, full_name, gender, service_type, date_of_birth, created_at FROM registrations WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Registration submitted successfully. Our team will contact you shortly.',
      registration: newRows[0],
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/registrations (admin) ───────────────────────────
const getAll = async (req, res, next) => {
  try {
    const { status, service_type, page = 1, limit = 20 } = req.query;
    const limitNum  = parseInt(limit, 10)  || 20;
    const offsetNum = (parseInt(page, 10) - 1) * limitNum;

    const conditions = [];
    const params     = [];

    if (status) {
      conditions.push('r.status = ?');
      params.push(status);
    }
    if (service_type) {
      conditions.push('r.service_type = ?');
      params.push(service_type);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [[rows], [countRows]] = await Promise.all([
      pool.query(
        `SELECT r.*, u.name AS reviewed_by_name
         FROM registrations r
         LEFT JOIN admin_users u ON r.reviewed_by = u.id
         ${where}
         ORDER BY r.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limitNum, offsetNum]
      ),
      pool.query(
        `SELECT COUNT(*) AS total FROM registrations r ${where}`,
        params
      ),
    ]);

    const totalRecords = Number(countRows[0]?.total || 0);
    const currentPage = parseInt(page, 10);
    const totalPages = Math.ceil(totalRecords / limitNum);

    res.json({
      success: true,
      data: rows,
      totalRecords,
      total: totalRecords,
      page: currentPage,
      limit: limitNum,
      pages: totalPages,
      totalPages: totalPages,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/registrations/:id (admin) ───────────────────────
const getById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.*, u.name AS reviewed_by_name
       FROM registrations r
       LEFT JOIN admin_users u ON r.reviewed_by = u.id
       WHERE r.id = ?`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Registration not found.' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/registrations/:id/status (admin approval & provisioning) ───
const updateStatus = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { status, status_note, product_id, member_id, interest_rate, term_months } = req.body;
    const validStatuses = ['new', 'contacted', 'approved', 'completed', 'rejected'];

    if (!validStatuses.includes(status)) {
      connection.release();
      return res.status(400).json({ error: 'Invalid status provided.' });
    }

    await connection.beginTransaction();

    // 1. Fetch current registration record
    const [existingRows] = await connection.query(
      'SELECT * FROM registrations WHERE id = ?',
      [req.params.id]
    );

    if (existingRows.length === 0) {
      await connection.rollback(); 
      connection.release();
      return res.status(404).json({ error: 'Registration record not found.' });
    }

    const reg = existingRows[0];

    // 2. Update status in registrations table
    await connection.query(
      `UPDATE registrations
       SET status = ?, status_note = ?, reviewed_by = ?, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [status, status_note || null, req.user?.id || null, req.params.id]
    );

    // 3. Provisioning Logic: Triggered whenever status is 'approved'
    if (status === 'approved') {

      // --- Helper: Resolve or Create Member ---
      let activeMemberId = member_id || null;

      if (!activeMemberId) {
        const [existingMember] = await connection.query(
          `SELECT member_id FROM members 
           WHERE (phone IS NOT NULL AND phone = ?)
              OR (email IS NOT NULL AND email = ?)
              OR (national_id IS NOT NULL AND national_id = ?)
           LIMIT 1`,
          [
            reg.phone || null, 
            reg.email || null, 
            reg.ghana_card || null
          ]
        );

        if (existingMember.length > 0) {
          activeMemberId = existingMember[0].member_id;
        } else {
          const nameParts = (reg.full_name || '').trim().split(' ');
          const firstName = nameParts[0] || 'Member';
          const lastName  = nameParts.slice(1).join(' ') || 'User';

          const randomNum    = Math.floor(10000 + Math.random() * 90000);
          const memberNumber = `MEM-${randomNum}`;
          
          // Pulls gender from registration record dynamically now
          const gender       = reg.gender || 'Male';
          
          const dob          = sanitizeDob(reg.date_of_birth);
          const nationalId   = reg.ghana_card || `GH-${randomNum}`;
          const address      = reg.address || null;

          const [newMemResult] = await connection.query(
            `INSERT INTO members 
                (member_number, first_name, last_name, gender, date_of_birth, national_id, phone, email, residential_address, occupation)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              memberNumber, firstName, lastName, gender, dob,
              nationalId, reg.phone, reg.email || null, address, reg.occupation || null
            ]
          );
          activeMemberId = newMemResult.insertId;
        }
      }

      if (!activeMemberId) {
        throw new Error('Unable to associate or generate a valid member profile for this loan.');
      }

      // --- Provision Loan ---
      if (reg.service_type === 'loan') {
        let targetLoanProductId = product_id || null;

        if (!targetLoanProductId) {
          try {
            const [lp] = await connection.query(`SELECT loan_product_id FROM loanproducts LIMIT 1`);
            if (lp.length > 0) {
              targetLoanProductId = lp[0].loan_product_id;
            }
          } catch (lpErr) {}
        }

        if (!targetLoanProductId) {
          try {
            const [p] = await connection.query(
              `SELECT id FROM products WHERE category = 'loans' AND is_active = 1 LIMIT 1`
            );
            if (p.length > 0) targetLoanProductId = p[0].id;
          } catch (pErr) {}
        }

        if (!targetLoanProductId) {
          throw new Error('Loan approval failed: No active loan products found in the database.');
        }

        let loanNum = '';
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 5) {
          attempts++;
          const randomDigits = Math.floor(100000 + Math.random() * 900000);
          loanNum = `LN-${new Date().getFullYear()}-${randomDigits}`;

          const [chk] = await connection.query(
            `SELECT loan_id FROM loans WHERE loan_number = ? LIMIT 1`,
            [loanNum]
          );
          if (chk.length === 0) isUnique = true;
        }

        const principalAmt = reg.loan_amount || 0.00;
        const rate         = interest_rate || 5.00;
        const term         = term_months || 12;

        await connection.query(
          `INSERT INTO loans 
            (loan_number, member_id, loan_product_id, principal_amount, interest_rate, term_months, application_date, approval_date)
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            loanNum,
            activeMemberId,
            targetLoanProductId,
            principalAmt,
            rate,
            term
          ]
        );
      }
    }

    await connection.commit();

    const [updated] = await pool.query(
      'SELECT * FROM registrations WHERE id = ?',
      [req.params.id]
    );

    try {
      await auditLog(
        req,
        'UPDATE_REGISTRATION_STATUS',
        'registrations',
        req.params.id,
        { status, service_type: reg.service_type, previous_status: reg.status }
      );
    } catch (auditErr) {
      console.error('Audit log failed (non-blocking):', auditErr);
    }

    res.json(updated[0]);
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

module.exports = { submit, getAll, getById, updateStatus };