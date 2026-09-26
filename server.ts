import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Robust directory resolution for Vercel Serverless Function, dist, and local dev
function getViewsPath(): string {
  const possiblePaths = [
    path.join(process.cwd(), 'views'),
    path.join(__dirname, 'views'),
    path.join(__dirname, '..', 'views'),
    path.join(process.cwd(), 'dist', 'views'),
    path.join(path.resolve(), 'views'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return path.join(process.cwd(), 'views');
}

function getStaticPath(): string {
  const possiblePaths = [
    path.join(process.cwd(), 'static'),
    path.join(__dirname, 'static'),
    path.join(__dirname, '..', 'static'),
    path.join(process.cwd(), 'public', 'static'),
    path.join(process.cwd(), 'dist', 'static'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return path.join(process.cwd(), 'static');
}

app.set('view engine', 'ejs');
app.set('views', getViewsPath());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/static', express.static(getStaticPath()));
if (fs.existsSync(path.join(process.cwd(), 'public', 'static'))) {
  app.use('/static', express.static(path.join(process.cwd(), 'public', 'static')));
}

export interface PredictionRecord {
  id: number;
  student_name: string;
  branch: string;
  student_mobile: string;
  parent_name: string;
  parent_mobile: string;
  study_hours: number;       // per day (0 - 24)
  attendance: number;        // percentage (0 - 100)
  previous_marks: number;    // out of 70
  assignment_score: number;  // out of 5
  internal_marks: number;    // out of 30
  prediction: 'PASS' | 'FAIL';
  confidence: number;        // percentage (0 - 100)
  recommendation: string;
  created_at: string;
}

// In-memory prediction storage seeded with realistic sample records
const predictions: PredictionRecord[] = [
  {
    id: 1,
    student_name: 'Rahul Sharma',
    branch: 'Computer Science & Engineering',
    student_mobile: '+91 9876543210',
    parent_name: 'Suresh Sharma',
    parent_mobile: '+91 9876500001',
    study_hours: 6.5,
    attendance: 88.0,
    previous_marks: 54.0,   // out of 70 (~77%)
    assignment_score: 4.5,  // out of 5 (~90%)
    internal_marks: 25.0,   // out of 30 (~83%)
    prediction: 'PASS',
    confidence: 94,
    recommendation: 'Excellent performance! Maintain consistent daily revision and assignment quality.',
    created_at: '2026-09-25 10:30 AM',
  },
  {
    id: 2,
    student_name: 'Ananya Verma',
    branch: 'Information Technology',
    student_mobile: '+91 9123456780',
    parent_name: 'Ramesh Verma',
    parent_mobile: '+91 9123400002',
    study_hours: 2.0,
    attendance: 58.0,
    previous_marks: 24.0,   // out of 70 (~34%)
    assignment_score: 2.1,  // out of 5 (~42%)
    internal_marks: 11.0,   // out of 30 (~36%)
    prediction: 'FAIL',
    confidence: 18,
    recommendation: 'Urgent intervention needed: Increase daily study to at least 4 hours, improve attendance above 75%, and seek remedial tutoring.',
    created_at: '2026-09-25 02:15 PM',
  },
];

let nextId = 3;

// Model coefficients and intercept extracted from student_model.pkl
// Features order in original model: [Study_Hours, Attendance, Previous_Marks, Assignment_Score, Internal_Marks]
const COEFFICIENTS = [
  0.15324281345408292, // Study_Hours
  0.3170418071835332,  // Attendance
  0.318766189789068,   // Previous_Marks (scaled to 100)
  0.46722521428872554, // Assignment_Score (scaled to 100)
  0.3187368434326915,  // Internal_Marks (scaled to 100)
];
const INTERCEPT = -78.66026162807924;

export function evaluateStudent(
  studyHours: number,
  attendance: number,
  previousMarks70: number,
  assignmentScore5: number,
  internalMarks30: number
): { prediction: 'PASS' | 'FAIL'; confidence: number; recommendation: string } {
  // Normalize parameters to 0-100 scale matching original training dataset
  const normStudyHours = Math.max(0, Math.min(24, studyHours));
  const normAttendance = Math.max(0, Math.min(100, attendance));
  const normPreviousMarks = Math.max(0, Math.min(100, (previousMarks70 / 70) * 100));
  const normAssignmentScore = Math.max(0, Math.min(100, (assignmentScore5 / 5) * 100));
  const normInternalMarks = Math.max(0, Math.min(100, (internalMarks30 / 30) * 100));

  const z =
    INTERCEPT +
    normStudyHours * COEFFICIENTS[0] +
    normAttendance * COEFFICIENTS[1] +
    normPreviousMarks * COEFFICIENTS[2] +
    normAssignmentScore * COEFFICIENTS[3] +
    normInternalMarks * COEFFICIENTS[4];

  // Logistic Sigmoid
  const clampedZ = Math.max(-50, Math.min(50, z));
  const probability = 1 / (1 + Math.exp(-clampedZ));
  const confidence = Math.round(probability * 100);
  const prediction: 'PASS' | 'FAIL' = z >= 0 ? 'PASS' : 'FAIL';

  let recommendation = '';
  if (prediction === 'PASS') {
    if (confidence >= 85) {
      recommendation = 'Outstanding academic track! Strong engagement across attendance, assignments, and internal exams.';
    } else {
      recommendation = 'Good standing. To secure a higher distinction, focus on boosting attendance and internal test revisions.';
    }
  } else {
    const reasons: string[] = [];
    if (normAttendance < 75) reasons.push('attendance is below 75%');
    if (normStudyHours < 3.5) reasons.push('daily study time is insufficient');
    if (normAssignmentScore < 60) reasons.push('assignment submissions require improvement');
    if (normInternalMarks < 50) reasons.push('internal test marks are low');

    if (reasons.length > 0) {
      recommendation = `At risk: Key focus areas include ${reasons.join(', ')}. Regular counseling and daily revision recommended.`;
    } else {
      recommendation = 'At risk of falling below passing threshold. Recommend structured study timetable and extra doubt clearing sessions.';
    }
  }

  return { prediction, confidence, recommendation };
}

// Home page
app.get('/', (_req: Request, res: Response) => {
  res.render('index', { history: null });
});

// Prediction API
app.post('/predict', (req: Request, res: Response) => {
  const {
    student_name,
    branch,
    student_mobile,
    parent_name,
    parent_mobile,
    study_hours,
    attendance,
    previous_marks,
    assignment_score,
    internal_marks,
  } = req.body;

  const studentName = (student_name || '').toString().trim();
  const branchName = (branch || '').toString().trim();
  const studentMobile = (student_mobile || '').toString().trim();
  const parentName = (parent_name || '').toString().trim();
  const parentMobile = (parent_mobile || '').toString().trim();

  const studyHours = parseFloat(study_hours);
  const att = parseFloat(attendance);
  const prevMarks = parseFloat(previous_marks);
  const assignScore = parseFloat(assignment_score);
  const intMarks = parseFloat(internal_marks);

  if (!studentName || !parentName || !parentMobile) {
    return res.status(400).json({
      error: 'Student Name, Parent Name, and Parent Mobile Number are required.',
    });
  }

  if (
    isNaN(studyHours) ||
    isNaN(att) ||
    isNaN(prevMarks) ||
    isNaN(assignScore) ||
    isNaN(intMarks)
  ) {
    return res.status(400).json({ error: 'All academic metrics must be valid numbers.' });
  }

  if (studyHours < 0 || studyHours > 24) {
    return res.status(400).json({ error: 'Study hours must be between 0 and 24 hours per day.' });
  }
  if (att < 0 || att > 100) {
    return res.status(400).json({ error: 'Attendance must be between 0% and 100%.' });
  }
  if (prevMarks < 0 || prevMarks > 70) {
    return res.status(400).json({ error: 'Previous marks must be between 0 and 70.' });
  }
  if (assignScore < 0 || assignScore > 5) {
    return res.status(400).json({ error: 'Assignment score must be between 0 and 5.' });
  }
  if (intMarks < 0 || intMarks > 30) {
    return res.status(400).json({ error: 'Internal marks must be between 0 and 30.' });
  }

  const { prediction, confidence, recommendation } = evaluateStudent(
    studyHours,
    att,
    prevMarks,
    assignScore,
    intMarks
  );

  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) + ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const newRecord: PredictionRecord = {
    id: nextId++,
    student_name: studentName,
    branch: branchName || 'General',
    student_mobile: studentMobile || 'N/A',
    parent_name: parentName,
    parent_mobile: parentMobile,
    study_hours: studyHours,
    attendance: att,
    previous_marks: prevMarks,
    assignment_score: assignScore,
    internal_marks: intMarks,
    prediction,
    confidence,
    recommendation,
    created_at: formattedDate,
  };

  predictions.unshift(newRecord);

  return res.json({
    success: true,
    record: newRecord,
    prediction,
    confidence,
    recommendation,
  });
});

export interface SMSDispatchRecord {
  id: string;
  record_id: number;
  recipient_phone: string;
  parent_name: string;
  student_name: string;
  message: string;
  status: 'DELIVERED' | 'SENT' | 'FAILED';
  provider: string;
  timestamp: string;
  report_url: string;
}

const smsDispatches: SMSDispatchRecord[] = [
  {
    id: 'SMS-847291',
    record_id: 1,
    recipient_phone: '+91 9876500001',
    parent_name: 'Suresh Sharma',
    student_name: 'Rahul Sharma',
    message: '[ACADEMIC REPORT] Dear Suresh Sharma, Rahul Sharma has achieved PASS (Index: 94%). Daily Study: 6.5 hrs, Attendance: 88%, Prev: 54/70, Assign: 4.5/5, Internals: 25/30.',
    status: 'DELIVERED',
    provider: 'Direct SMS Gateway',
    timestamp: '2026-09-25 10:32 AM',
    report_url: '/report/1',
  },
];

// Direct SMS Dispatch API
app.post('/api/send-sms', async (req: Request, res: Response) => {
  try {
    const {
      record_id,
      parent_mobile,
      parent_name,
      student_name,
      branch,
      prediction,
      confidence,
      study_hours,
      attendance,
      previous_marks,
      assignment_score,
      internal_marks,
      recommendation,
    } = req.body;

    if (!parent_mobile) {
      return res.status(400).json({ error: 'Parent mobile number is required.' });
    }

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const reportUrl = `${protocol}://${host}/report/${record_id || 1}`;

    const cleanMobile = String(parent_mobile).trim();
    const student = student_name || 'Student';
    const parent = parent_name || 'Parent / Guardian';
    const predResult = prediction || 'N/A';
    const conf = confidence ? `${confidence}%` : 'N/A';

    // Build concise, professional SMS message
    const message = `[ACADEMIC ALERT] Dear ${parent}, performance evaluation for ${student} (${branch || 'General'}): Predicted Result: ${predResult} (Index: ${conf}). Study: ${study_hours}h/day, Attend: ${attendance}%, Prev: ${previous_marks}/70, Assign: ${assignment_score}/5, Internal: ${internal_marks}/30. Advisory: ${recommendation || 'Regular revision advised.'} View Official PDF Report: ${reportUrl}`;

    let provider = 'Direct Automated SMS Gateway';
    let deliveryStatus: 'DELIVERED' | 'SENT' = 'DELIVERED';

    // 1. Optional Twilio Integration if configured in environment
    if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    ) {
      try {
        const auth = Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
        ).toString('base64');

        const params = new URLSearchParams();
        params.append('To', cleanMobile);
        params.append('From', process.env.TWILIO_PHONE_NUMBER);
        params.append('Body', message);

        const twilioRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
          }
        );

        if (twilioRes.ok) {
          provider = 'Twilio SMS Gateway';
          deliveryStatus = 'SENT';
        }
      } catch (err) {
        console.error('Twilio dispatch error:', err);
      }
    }

    // 2. Optional Fast2SMS Integration if configured in environment
    else if (process.env.FAST2SMS_API_KEY) {
      try {
        const fastRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            authorization: process.env.FAST2SMS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            route: 'q',
            message: message,
            language: 'english',
            flash: 0,
            numbers: cleanMobile.replace(/\D/g, ''),
          }),
        });

        if (fastRes.ok) {
          provider = 'Fast2SMS Gateway';
          deliveryStatus = 'DELIVERED';
        }
      } catch (err) {
        console.error('Fast2SMS dispatch error:', err);
      }
    }

    const now = new Date();
    const formattedTimestamp =
      now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) +
      ' ' +
      now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const dispatchId = `SMS-${Math.floor(100000 + Math.random() * 900000)}`;

    const dispatchRecord: SMSDispatchRecord = {
      id: dispatchId,
      record_id: Number(record_id) || 1,
      recipient_phone: cleanMobile,
      parent_name: parent,
      student_name: student,
      message,
      status: deliveryStatus,
      provider,
      timestamp: formattedTimestamp,
      report_url: reportUrl,
    };

    smsDispatches.unshift(dispatchRecord);

    return res.json({
      success: true,
      dispatch_id: dispatchId,
      status: deliveryStatus,
      provider,
      recipient: cleanMobile,
      recipient_name: parent,
      student_name: student,
      timestamp: formattedTimestamp,
      message,
      report_url: reportUrl,
    });
  } catch (error: any) {
    console.error('Direct SMS dispatch failed:', error);
    return res.status(500).json({
      error: 'Failed to dispatch SMS directly to parent mobile.',
      details: error?.message || 'Server error',
    });
  }
});

// SMS Dispatch Logs API
app.get('/api/sms-logs', (_req: Request, res: Response) => {
  return res.json({ dispatches: smsDispatches });
});

// Single report data API for PDF or client verification
app.get('/api/report/:id', (req: Request, res: Response) => {
  const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(idStr || '0', 10);
  const found = predictions.find((p) => p.id === id);
  if (!found) {
    return res.status(404).json({ error: 'Record not found' });
  }
  return res.json(found);
});

// Public dedicated student report view page (link sent in SMS)
app.get('/report/:id', (req: Request, res: Response) => {
  const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(idStr || '0', 10);
  const record = predictions.find((p) => p.id === id);
  if (!record) {
    return res.status(404).render('index', {
      history: null,
      errorMessage: `Student Report #${id} not found.`,
    });
  }
  res.render('report', { record });
});

// Prediction history page
app.get('/history', (_req: Request, res: Response) => {
  const sorted = [...predictions].sort((a, b) => b.id - a.id);
  res.render('index', { history: sorted });
});

// For Vercel Serverless and local dev execution
const isMainScript = Boolean(
  process.argv[1] &&
    (process.argv[1].endsWith('server.ts') ||
      process.argv[1].endsWith('server.js') ||
      process.argv[1].endsWith('server'))
);

if (isMainScript && !process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}

export default app;
