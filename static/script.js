// Current active prediction record in memory
let currentReportData = null;

// Form submission handler
document.getElementById('predictionForm').addEventListener('submit', async function (event) {
  event.preventDefault();

  const submitBtn = document.getElementById('submitBtn');
  const originalBtnText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span>⏳ Evaluating Academic Performance...</span>';

  const formData = {
    student_name: document.getElementById('student_name').value.trim(),
    branch: document.getElementById('branch').value.trim(),
    student_mobile: document.getElementById('student_mobile').value.trim(),
    parent_name: document.getElementById('parent_name').value.trim(),
    parent_mobile: document.getElementById('parent_mobile').value.trim(),
    study_hours: document.getElementById('study_hours').value,
    attendance: document.getElementById('attendance').value,
    previous_marks: document.getElementById('previous_marks').value,
    assignment_score: document.getElementById('assignment_score').value,
    internal_marks: document.getElementById('internal_marks').value,
  };

  try {
    const response = await fetch('/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      alert(data.error || 'Failed to generate prediction. Please check your inputs.');
      return;
    }

    currentReportData = data.record;
    displayPredictionResult(data.record);

    // If table exists on the page, prepend the new record
    prependHistoryTable(data.record);

  } catch (error) {
    console.error('Error during prediction:', error);
    alert('An unexpected error occurred while processing the prediction.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
});

// Update UI with prediction outcome
function displayPredictionResult(record) {
  const resultCard = document.getElementById('resultCard');
  resultCard.classList.remove('hidden');

  const badge = document.getElementById('predictionBadge');
  badge.textContent = record.prediction;
  badge.className = 'prediction-badge ' + (record.prediction === 'PASS' ? 'badge-pass' : 'badge-fail');

  document.getElementById('confidenceValue').textContent = record.confidence + '%';
  document.getElementById('resStudentName').textContent = record.student_name;
  document.getElementById('resBranch').textContent = record.branch;
  document.getElementById('resParentName').textContent = record.parent_name;
  document.getElementById('resParentMobile').textContent = record.parent_mobile;

  document.getElementById('resStudyHours').textContent = record.study_hours + ' hrs';
  document.getElementById('resAttendance').textContent = record.attendance + '%';
  document.getElementById('resPrevMarks').textContent = record.previous_marks + ' / 70';
  document.getElementById('resAssignment').textContent = record.assignment_score + ' / 5';
  document.getElementById('resInternal').textContent = record.internal_marks + ' / 30';

  document.getElementById('resRecommendation').textContent = record.recommendation;
  document.getElementById('dispatchStatus').textContent = '';

  resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Prepend new row to history table
function prependHistoryTable(record) {
  const tbody = document.querySelector('.history-table tbody');
  if (!tbody) return;

  const tr = document.createElement('tr');
  const recordJson = JSON.stringify(record).replace(/"/g, '&quot;');
  tr.innerHTML = `
    <td><strong>#${record.id}</strong></td>
    <td>
      <div class="student-cell">
        <span class="cell-name">${escapeHtml(record.student_name)}</span>
        <span class="cell-sub">${escapeHtml(record.branch)}</span>
      </div>
    </td>
    <td>${escapeHtml(record.student_mobile)}</td>
    <td>
      <div class="parent-cell">
        <span class="cell-name">${escapeHtml(record.parent_name)}</span>
        <span class="cell-sub">${escapeHtml(record.parent_mobile)}</span>
      </div>
    </td>
    <td>${record.study_hours} hrs</td>
    <td>${record.attendance}%</td>
    <td>${record.previous_marks}</td>
    <td>${record.assignment_score}</td>
    <td>${record.internal_marks}</td>
    <td>
      <span class="table-badge ${record.prediction === 'PASS' ? 'badge-pass' : 'badge-fail'}">
        ${record.prediction}
      </span>
    </td>
    <td>
      <div class="table-actions">
        <button type="button" class="table-pdf-btn" onclick='generateReportPdfFromData(${JSON.stringify(record)})' title="Download PDF">
          📥 PDF
        </button>
        <button type="button" class="table-sms-btn" onclick='sendParentSmsDirectlyFromData(${JSON.stringify(record)})' title="Send Direct SMS (No App)">
          ⚡ SMS
        </button>
        <button type="button" class="table-wa-btn" onclick='sendParentWhatsAppFromData(${JSON.stringify(record)})' title="WhatsApp Parent">
          💬 WhatsApp
        </button>
      </div>
    </td>
  `;

  tbody.insertBefore(tr, tbody.firstChild);

  // Update count badge
  const countBadge = document.querySelector('.count-badge');
  if (countBadge) {
    const currentCount = tbody.querySelectorAll('tr').length;
    countBadge.textContent = currentCount + ' records';
  }
}

// Generate PDF Report using jsPDF and AutoTable
function generateReportPdfFromData(data) {
  if (!data) return;

  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) {
    alert('PDF generation library is loading. Please wait a moment and try again.');
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Top header decorative band
  doc.setFillColor(37, 99, 235); // #2563eb
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('STUDENT ACADEMIC PERFORMANCE REPORT', pageWidth / 2, 11, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Machine Learning Based Academic Evaluation & Forecast', pageWidth / 2, 18, { align: 'center' });

  // Report Metadata Bar
  doc.setFillColor(241, 245, 249);
  doc.rect(14, 28, pageWidth - 28, 12, 'F');
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Report ID: #SPR-${String(data.id).padStart(5, '0')}`, 18, 35);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${data.created_at || new Date().toLocaleString()}`, pageWidth - 18, 35, { align: 'right' });

  // Section 1: Student & Parent Profile
  let yPos = 46;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('1. Student & Guardian Information', 14, yPos);

  const profileData = [
    [
      { content: 'Student Name', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      data.student_name,
      { content: 'Parent / Guardian', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      data.parent_name,
    ],
    [
      { content: 'Branch / Dept', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      data.branch,
      { content: 'Parent Contact', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      data.parent_mobile,
    ],
    [
      { content: 'Student Mobile', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      data.student_mobile || 'N/A',
      { content: 'Institution Mode', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      'Semester Regular',
    ],
  ];

  doc.autoTable({
    startY: yPos + 3,
    body: profileData,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 36 },
      1: { cellWidth: 54 },
      2: { cellWidth: 38 },
      3: { cellWidth: 54 },
    },
    margin: { left: 14, right: 14 },
  });

  // Section 2: Academic Metrics Evaluation
  yPos = doc.lastAutoTable.finalY + 9;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. Academic Performance Metrics', 14, yPos);

  // Compute percentage equivalents for clarity
  const prevMarksPct = Math.round((data.previous_marks / 70) * 100);
  const assignPct = Math.round((data.assignment_score / 5) * 100);
  const internalPct = Math.round((data.internal_marks / 30) * 100);

  const academicData = [
    ['Study Hours (Daily)', `${data.study_hours} hrs / day`, '24.0 hrs', `${Math.round((data.study_hours / 24) * 100)}%`, data.study_hours >= 4 ? 'Satisfactory' : 'Needs Increase'],
    ['Class Attendance', `${data.attendance}%`, '100%', `${data.attendance}%`, data.attendance >= 75 ? 'Good' : 'Below 75% Threshold'],
    ['Previous Semester Marks', `${data.previous_marks} / 70`, '70 Marks', `${prevMarksPct}%`, prevMarksPct >= 50 ? 'Cleared' : 'Critical'],
    ['Assignment Evaluation', `${data.assignment_score} / 5.0`, '5.0 Marks', `${assignPct}%`, assignPct >= 60 ? 'On Track' : 'Incomplete/Low'],
    ['Internal Assessments', `${data.internal_marks} / 30.0`, '30.0 Marks', `${internalPct}%`, internalPct >= 50 ? 'Passing' : 'Below Passing'],
  ];

  doc.autoTable({
    startY: yPos + 3,
    head: [['Assessment Factor', 'Student Value', 'Max Scale', 'Normalized %', 'Status / Remark']],
    body: academicData,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 9, fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 3, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 32 },
      2: { cellWidth: 26 },
      3: { cellWidth: 28 },
      4: { cellWidth: 46 },
    },
    margin: { left: 14, right: 14 },
  });

  // Section 3: Machine Learning Model Outcome & Recommendation
  yPos = doc.lastAutoTable.finalY + 9;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('3. Machine Learning Assessment & Forecast', 14, yPos);

  // Result Badge Box
  const isPass = data.prediction === 'PASS';
  const badgeColor = isPass ? [22, 163, 74] : [220, 38, 38]; // Green or Red
  const badgeBg = isPass ? [220, 252, 231] : [254, 226, 226];

  doc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2]);
  doc.setDrawColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.setLineWidth(0.6);
  doc.roundedRect(14, yPos + 4, pageWidth - 28, 22, 3, 3, 'FD');

  doc.setTextColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`PREDICTED RESULT: ${data.prediction}`, 22, yPos + 14);

  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(`Estimated Success Index / Confidence: ${data.confidence}%`, 22, yPos + 21);

  // Recommendation box
  const recY = yPos + 30;
  doc.setFillColor(239, 246, 255);
  doc.rect(14, recY, pageWidth - 28, 20, 'F');
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(1);
  doc.line(14, recY, 14, recY + 20);

  doc.setTextColor(29, 78, 216);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Faculty Advisory & Recommended Action Plan:', 18, recY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 58, 138);
  const splitRec = doc.splitTextToSize(data.recommendation || 'Maintain regular attendance and continuous revision.', pageWidth - 36);
  doc.text(splitRec, 18, recY + 12);

  // Section 4: Parental Dispatch Notice & Signature Block
  const footerY = 252;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text(`Notice: A digital summary of this report has been transmitted to Parent / Guardian: ${data.parent_name} (${data.parent_mobile}).`, 14, footerY);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(14, footerY + 4, pageWidth - 14, footerY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Generated by Student Performance Predictor • Academic AI Engine', 14, footerY + 10);
  doc.text('Authorized Academic Institution Copy', pageWidth - 14, footerY + 10, { align: 'right' });

  // Save the document
  const sanitizedName = data.student_name.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Student_Performance_Report_${sanitizedName}.pdf`);
  return doc;
}

// Clean phone number for WhatsApp / SMS URL dispatch
function cleanPhoneNumber(phone) {
  if (!phone) return '';
  // Remove non-digits except leading +
  let cleaned = phone.replace(/[\s()-]/g, '');
  // If 10 digits without country code, prefix with 91 (standard in India) or leave as is
  if (/^\d{10}$/.test(cleaned)) {
    cleaned = '91' + cleaned;
  } else if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
}

// Generate formatted message for WhatsApp / SMS
function buildParentNotificationText(data) {
  return `🎓 *STUDENT ACADEMIC PERFORMANCE REPORT*
----------------------------------------
*Student:* ${data.student_name}
*Branch:* ${data.branch}
*Parent / Guardian:* ${data.parent_name}

📊 *Academic Evaluation:*
• Daily Study Hours: ${data.study_hours} hrs/day
• Attendance: ${data.attendance}%
• Previous Marks: ${data.previous_marks} / 70
• Assignment Score: ${data.assignment_score} / 5
• Internal Marks: ${data.internal_marks} / 30

🎯 *Predicted Standing:* *${data.prediction}*
📈 *Success Index:* ${data.confidence}%

💡 *Faculty Advisory:*
${data.recommendation}

Report Generated on: ${data.created_at || new Date().toLocaleString()}
----------------------------------------
Please review this report with your ward for academic guidance.`;
}

// Send WhatsApp directly to parent mobile
async function sendParentWhatsAppFromData(data) {
  if (!data || !data.parent_mobile) {
    alert('Parent mobile number is missing.');
    return;
  }

  const phone = cleanPhoneNumber(data.parent_mobile);
  const message = buildParentNotificationText(data);
  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  // Also check if Web Share API with PDF file is supported
  const { jsPDF } = window.jspdf || {};
  let pdfShared = false;

  if (navigator.canShare && jsPDF) {
    try {
      const doc = generateReportPdfFromData(data);
      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], `Report_${data.student_name.replace(/\s+/g, '_')}.pdf`, { type: 'application/pdf' });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Academic Report for ${data.student_name}`,
          text: message,
        });
        pdfShared = true;
        const statusEl = document.getElementById('dispatchStatus');
        if (statusEl) {
          statusEl.textContent = `✅ PDF report shared directly for parent (${data.parent_mobile})!`;
        }
        return;
      }
    } catch (e) {
      // User cancelled share or file sharing fell through; proceed to WhatsApp link
      console.log('Web share fallback to WhatsApp link:', e);
    }
  }

  if (!pdfShared) {
    // Open WhatsApp Web or App
    window.open(waUrl, '_blank');
    const statusEl = document.getElementById('dispatchStatus');
    if (statusEl) {
      statusEl.textContent = `📱 Opened WhatsApp with academic report for Parent (${data.parent_mobile})!`;
    }
  }
}

// Send SMS directly to parent mobile without opening any external apps
async function sendParentSmsDirectlyFromData(data) {
  if (!data || !data.parent_mobile) {
    alert('Parent mobile number is missing.');
    return;
  }

  const sendSmsBtn = document.getElementById('sendSmsBtn');
  let originalHtml = '';
  if (sendSmsBtn && (!data.id || (currentReportData && currentReportData.id === data.id))) {
    originalHtml = sendSmsBtn.innerHTML;
    sendSmsBtn.disabled = true;
    sendSmsBtn.innerHTML = '<span>⏳ Sending Direct SMS...</span>';
  }

  const statusEl = document.getElementById('dispatchStatus');
  if (statusEl) {
    statusEl.textContent = `📡 Dispatched direct carrier transmission to Parent (${data.parent_mobile})...`;
    statusEl.style.color = '#0284c7';
  }

  try {
    const response = await fetch('/api/send-sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        record_id: data.id,
        parent_mobile: data.parent_mobile,
        parent_name: data.parent_name,
        student_name: data.student_name,
        branch: data.branch,
        prediction: data.prediction,
        confidence: data.confidence,
        study_hours: data.study_hours,
        attendance: data.attendance,
        previous_marks: data.previous_marks,
        assignment_score: data.assignment_score,
        internal_marks: data.internal_marks,
        recommendation: data.recommendation,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to dispatch direct SMS.');
    }

    // Populate and open the SMS Modal directly without asking to open any app
    const recEl = document.getElementById('smsModalRecipient');
    const idEl = document.getElementById('smsModalDispatchId');
    const timeEl = document.getElementById('smsModalTimestamp');
    const msgEl = document.getElementById('smsModalMessage');

    if (recEl) recEl.textContent = `${result.recipient_name} (${result.recipient})`;
    if (idEl) idEl.textContent = result.dispatch_id;
    if (timeEl) timeEl.textContent = result.timestamp;
    if (msgEl) msgEl.textContent = result.message;

    const modal = document.getElementById('smsModal');
    if (modal) {
      modal.classList.remove('hidden');
    }

    if (statusEl) {
      statusEl.textContent = `✅ Direct SMS delivered immediately to Parent (${result.recipient})! Dispatch Ref: #${result.dispatch_id}`;
      statusEl.style.color = '#15803d';
    }
  } catch (error) {
    console.error('Direct SMS delivery failed:', error);
    alert('Direct SMS transmission failed: ' + (error.message || 'Please check your connection.'));
    if (statusEl) {
      statusEl.textContent = `❌ Direct SMS delivery error. Please try again.`;
      statusEl.style.color = '#dc2626';
    }
  } finally {
    if (sendSmsBtn && originalHtml) {
      sendSmsBtn.disabled = false;
      sendSmsBtn.innerHTML = originalHtml;
    }
  }
}

function closeSmsModal() {
  const modal = document.getElementById('smsModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Close modal on Escape key
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    closeSmsModal();
  }
});

// Action button bindings on the result card
document.getElementById('downloadPdfBtn').addEventListener('click', function () {
  if (currentReportData) {
    generateReportPdfFromData(currentReportData);
  }
});

document.getElementById('sendWhatsAppBtn').addEventListener('click', function () {
  if (currentReportData) {
    sendParentWhatsAppFromData(currentReportData);
  }
});

document.getElementById('sendSmsBtn').addEventListener('click', function () {
  if (currentReportData) {
    sendParentSmsDirectlyFromData(currentReportData);
  }
});

// Helper for HTML escaping
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
