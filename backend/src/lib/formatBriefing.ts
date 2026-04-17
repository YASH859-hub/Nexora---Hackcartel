export function formatBriefing(userName: string, tasks: string[]): string {
  const name = String(userName || '').trim() || 'there';
  const lines: string[] = [
    `Good morning, ${name} ☀️`,
    '',
    "Here's your briefing for today:",
    '',
  ];

  if (!tasks || tasks.length === 0) {
    lines.push('• No tasks today');
  } else {
    for (const t of tasks) {
      const text = String(t || '').trim();
      if (text) lines.push(`• ${text}`);
    }
  }

  lines.push('', 'Stay on top of it.');
  return lines.join('\n');
}
