const body = `${dailyMarker}

# ⏰ Daily Issue Reminder

Hello ${mentions},

| Details | Value |
|---------|-------|
| 🏷 Difficulty | **${diffLabel.replace("difficulty: ", "").toUpperCase()}** |
| 📅 Assigned | **${assignedDateStr}** |
| ⌛ SLA | **${slaDays} day(s)** |
| 🎯 Due Date | **${dueDateStr}** |
| 📌 Status | ${statusLine} |

${actionLine}

> Please keep the issue updated so maintainers know the current progress.

Thank you for contributing! 🚀
`;
