function renderMarkdownReport(result) {
  const lines = [];
  lines.push(`# Evaluation Report: ${result.scenario.id}`);
  lines.push('');
  lines.push(`- Verdict: ${result.verdict}`);
  lines.push(`- Agent: ${result.scenario.agent}`);
  lines.push(`- Steps: ${result.steps.length}`);
  if (result.outputFiles && result.outputFiles.trace) {
    lines.push(`- Trace: ${result.outputFiles.trace}`);
  }
  lines.push('');
  lines.push('## Evaluators');
  for (const ev of result.evaluatorResults) {
    lines.push('');
    lines.push(`### ${ev.name}: ${ev.verdict}`);
    for (const msg of ev.messages || []) lines.push(`- ${msg}`);
  }
  return lines.join('\n') + '\n';
}

module.exports = { renderMarkdownReport };
