import type { Execution, Decision, Intent, Context, ReplayResponse } from '../api'

interface AuditReportData {
  execution: Execution
  decision: Decision
  intent: Intent
  context: Context
  replayResult?: ReplayResponse | null
}

// Colors
const GRAY_900 = [17, 24, 39] as const
const GRAY_500 = [107, 114, 128] as const
const GREEN = [22, 163, 74] as const
const RED = [220, 38, 38] as const
const GRAY_400 = [156, 163, 175] as const

const PAGE_WIDTH = 210
const MARGIN = 20
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const PAGE_BREAK_THRESHOLD = 265

export async function generateAuditReport(data: AuditReportData) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  let y = MARGIN
  const shortId = data.execution.id.slice(0, 8)

  // --- Helpers ---

  function checkPageBreak(needed: number) {
    if (y + needed > PAGE_BREAK_THRESHOLD) {
      doc.addPage()
      y = MARGIN
    }
  }

  function setColor(c: readonly [number, number, number]) {
    doc.setTextColor(c[0], c[1], c[2])
  }

  function drawLabel(label: string, value: string, x = MARGIN) {
    checkPageBreak(8)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    setColor(GRAY_500)
    doc.text(label, x + 4, y)
    setColor(GRAY_900)
    doc.setFontSize(10)
    const labelWidth = 38
    const valueLines = doc.splitTextToSize(value, CONTENT_WIDTH - labelWidth - 4)
    doc.text(valueLines, x + 4 + labelWidth, y)
    y += Math.max(valueLines.length, 1) * 4.5 + 2
  }

  function drawMonoLabel(label: string, value: string, x = MARGIN) {
    checkPageBreak(8)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    setColor(GRAY_500)
    doc.text(label, x + 4, y)
    doc.setFont('courier', 'normal')
    doc.setFontSize(8.5)
    setColor(GRAY_900)
    const labelWidth = 38
    const truncated = value.length > 80 ? value.slice(0, 77) + '...' : value
    doc.text(truncated, x + 4 + labelWidth, y)
    y += 6
    doc.setFont('helvetica', 'normal')
  }

  function drawSectionHeader(title: string) {
    checkPageBreak(14)
    y += 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    setColor(GRAY_900)
    doc.text(title, MARGIN, y)
    y += 2
    doc.setDrawColor(229, 231, 235)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
    y += 5
  }

  function drawHr() {
    doc.setDrawColor(209, 213, 219)
    doc.setLineWidth(0.4)
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
    y += 4
  }

  // --- Header ---

  // Logo text
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  setColor(GRAY_900)
  doc.text('TENET', MARGIN, y + 6)

  // Title
  y += 14
  doc.setFontSize(16)
  doc.text('Decision Audit Report', MARGIN, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  setColor(GRAY_500)
  doc.text('ISO 42001 Compliant Data Model', MARGIN, y)
  y += 4
  drawHr()
  y += 2

  // --- Verification Record ---
  drawSectionHeader(`VERIFICATION RECORD #${shortId}`)
  drawMonoLabel('Decision ID:', data.decision.id)
  drawLabel('Timestamp:', formatDate(data.execution.created_at))

  // --- Agent & Version ---
  drawSectionHeader('AGENT & VERSION')
  drawMonoLabel('Agent ID:', data.intent.agent_id)
  drawLabel('Model Version:', data.decision.model_version)
  drawLabel('Origin:', data.intent.origin)

  // --- Full Context & Intent ---
  drawSectionHeader('FULL CONTEXT & INTENT')
  drawLabel('Goal:', data.intent.goal)
  drawLabel(
    'Constraints:',
    data.intent.constraints.length > 0 ? data.intent.constraints.join(', ') : 'None'
  )
  drawMonoLabel('Session:', data.intent.session_id)
  drawMonoLabel('Snapshot Hash:', data.context.snapshot_hash)

  // Inputs (truncated JSON)
  const inputsJson = JSON.stringify(data.context.inputs, null, 2)
  const truncatedInputs = inputsJson.length > 500 ? inputsJson.slice(0, 497) + '...' : inputsJson
  checkPageBreak(20)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  setColor(GRAY_500)
  doc.text('Inputs:', MARGIN + 4, y)
  y += 4
  doc.setFont('courier', 'normal')
  doc.setFontSize(7.5)
  setColor(GRAY_900)
  const inputLines = doc.splitTextToSize(truncatedInputs, CONTENT_WIDTH - 8)
  const maxInputLines = Math.min(inputLines.length, 20)
  for (let i = 0; i < maxInputLines; i++) {
    checkPageBreak(4)
    doc.text(inputLines[i], MARGIN + 8, y)
    y += 3.5
  }
  if (inputLines.length > 20) {
    doc.text('...', MARGIN + 8, y)
    y += 3.5
  }
  y += 2
  doc.setFont('helvetica', 'normal')

  // --- Reasoning Log ---
  drawSectionHeader('REASONING LOG (LOGIC FLOW)')
  drawLabel(
    'Rules Evaluated:',
    data.decision.rules_evaluated.length > 0
      ? data.decision.rules_evaluated.join(', ')
      : 'None'
  )
  if (data.decision.reasoning) {
    checkPageBreak(12)
    doc.setFontSize(9)
    setColor(GRAY_500)
    doc.text('Reasoning:', MARGIN + 4, y)
    y += 4
    doc.setFontSize(10)
    setColor(GRAY_900)
    const reasoningLines = doc.splitTextToSize(data.decision.reasoning, CONTENT_WIDTH - 8)
    for (const line of reasoningLines) {
      checkPageBreak(5)
      doc.text(line, MARGIN + 8, y)
      y += 4.5
    }
    y += 2
  }

  // Options
  checkPageBreak(8)
  doc.setFontSize(9)
  setColor(GRAY_500)
  doc.text('Options Considered:', MARGIN + 4, y)
  y += 5
  for (const option of data.decision.options) {
    checkPageBreak(8)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    const isChosen = option.action === data.decision.chosen_action
    setColor(isChosen ? GREEN : GRAY_900)
    const marker = isChosen ? '> ' : '- '
    doc.text(`${marker}${option.action}  (score: ${option.score.toFixed(2)})`, MARGIN + 8, y)
    y += 4
    if (option.reason) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      setColor(GRAY_500)
      const reasonLines = doc.splitTextToSize(option.reason, CONTENT_WIDTH - 16)
      for (const line of reasonLines) {
        checkPageBreak(4)
        doc.text(line, MARGIN + 14, y)
        y += 3.5
      }
    }
    y += 1.5
  }

  // --- Outcome ---
  drawSectionHeader('OUTCOME')
  drawLabel('Chosen Action:', data.decision.chosen_action)
  drawLabel('Result:', data.execution.result)
  drawLabel(
    'Side Effects:',
    data.execution.side_effects.length > 0
      ? data.execution.side_effects.join(', ')
      : 'None'
  )

  // --- Verification Status ---
  drawSectionHeader('VERIFICATION STATUS')
  let statusText: string
  let statusColor: readonly [number, number, number]

  if (data.execution.actor === 'human') {
    statusText = 'HUMAN OVERRIDE — DECISION MANUALLY REVIEWED AND RECORDED'
    statusColor = [37, 99, 235] as const  // blue-600
  } else if (data.replayResult) {
    if (data.replayResult.diverged) {
      statusText = 'DIVERGENCE ALERT — DRIFTED'
      if (data.replayResult.divergence_reason) {
        statusText += `: ${data.replayResult.divergence_reason}`
      }
      statusColor = RED
    } else {
      statusText = 'VERIFIED — NO DRIFT DETECTED'
      statusColor = GREEN
    }
  } else {
    statusText = 'NOT VERIFIED — REPLAY NOT EXECUTED'
    statusColor = GRAY_400
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  const statusLines = doc.splitTextToSize(statusText, CONTENT_WIDTH - 12)
  const dynamicBoxHeight = 6 + statusLines.length * 5.5 + 4
  checkPageBreak(dynamicBoxHeight + 4)
  const boxY2 = y
  doc.setDrawColor(statusColor[0], statusColor[1], statusColor[2])
  doc.setLineWidth(0.5)
  doc.roundedRect(MARGIN, boxY2, CONTENT_WIDTH, dynamicBoxHeight, 2, 2, 'S')
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2])
  doc.text(statusLines, MARGIN + 6, boxY2 + 7)
  y = boxY2 + dynamicBoxHeight + 6

  // --- Confidence ---
  drawSectionHeader('CONFIDENCE')
  checkPageBreak(14)
  const pct = Math.round(data.decision.confidence * 100)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  setColor(GRAY_900)
  doc.text(`${pct}%`, MARGIN + 4, y)

  // Confidence bar
  const barX = MARGIN + 22
  const barW = CONTENT_WIDTH - 26
  const barH = 4
  doc.setFillColor(229, 231, 235)
  doc.roundedRect(barX, y - 3, barW, barH, 1.5, 1.5, 'F')
  doc.setFillColor(79, 70, 229) // indigo-600
  doc.roundedRect(barX, y - 3, barW * data.decision.confidence, barH, 1.5, 1.5, 'F')
  y += 8

  // --- Override Trace (conditional) ---
  if (data.execution.actor === 'human') {
    drawSectionHeader('OVERRIDE TRACE')
    if (data.execution.overridden_by) {
      drawLabel('Overridden By:', data.execution.overridden_by)
    }
    drawLabel('When:', formatDate(data.execution.created_at))
    if (data.execution.override_reason) {
      drawLabel('Reason:', data.execution.override_reason)
    }
  }

  // --- Footer ---
  checkPageBreak(12)
  y += 4
  drawHr()
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  setColor(GRAY_500)
  doc.text(
    `Generated ${new Date().toISOString().slice(0, 10)}  |  Tenet AI Governance Platform`,
    MARGIN,
    y
  )

  // Save
  doc.save(`tenet-audit-${shortId}.pdf`)
}

function formatDate(timestamp: string): string {
  const utc = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z'
  const d = new Date(utc)
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
