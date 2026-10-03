module.exports = async ({ github, context }) => {
  const owner = context.repo.owner;
  const repo = context.repo.repo;

  const SLA = {
    "difficulty: easy": 2,
    "difficulty: medium": 4,
    "difficulty: hard": 7,
  };

  const now = new Date();
  const dayStamp = now.toISOString().slice(0, 10);
  const dailyMarker = `<!-- daily-difficulty-reminder:${dayStamp} -->`;

  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  const addDaysUTC = (date, days) => {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  };

  const isoDate = (date) => date.toISOString().slice(0, 10);

  // Get all open issues
  const issues = await github.paginate(
    github.rest.issues.listForRepo,
    {
      owner,
      repo,
      state: "open",
      per_page: 100,
    }
  );

  for (const issue of issues) {
    // Skip pull requests
    if (issue.pull_request) continue;

    const labels = (issue.labels || [])
      .map((label) => (typeof label === "string" ? label : label.name))
      .filter(Boolean);

    // Find difficulty label
    const difficultyLabel = Object.keys(SLA).find((label) =>
      labels.includes(label)
    );

    if (!difficultyLabel) continue;

    // Get assignees
    const assignees = (issue.assignees || [])
      .map((assignee) => assignee.login)
      .filter(Boolean);

    if (assignees.length === 0) continue;

    const slaDays = SLA[difficultyLabel];

    // Get issue events
    const events = await github.paginate(
      github.rest.issues.listEvents,
      {
        owner,
        repo,
        issue_number: issue.number,
        per_page: 100,
      }
    );

    // Find the latest assignment event
    const assignedEvents = events
      .filter(
        (event) =>
          event.event === "assigned" &&
          event.created_at
      )
      .sort(
        (a, b) =>
          new Date(b.created_at) - new Date(a.created_at)
      );

    // SLA starts from latest assignment
    const assignedAt = assignedEvents.length
      ? new Date(assignedEvents[0].created_at)
      : new Date(issue.created_at);

    const dueAt = addDaysUTC(assignedAt, slaDays);

    const daysLeft = Math.ceil(
      (dueAt.getTime() - now.getTime()) / MS_PER_DAY
    );

    const assignedDate = isoDate(assignedAt);
    const dueDate = isoDate(dueAt);

    // Get existing comments
    const comments = await github.paginate(
      github.rest.issues.listComments,
      {
        owner,
        repo,
        issue_number: issue.number,
        per_page: 100,
      }
    );

    // Prevent duplicate reminder for the same day
    const alreadyRemindedToday = comments.some(
      (comment) =>
        (comment.body || "").includes(dailyMarker)
    );

    if (alreadyRemindedToday) continue;

    const mentions = assignees
      .map((username) => `@${username}`)
      .join(" ");

    let statusLine;
    let actionLine;

    if (daysLeft > 0) {
      statusLine = `✅ **${daysLeft} day(s) left** (due on **${dueDate}**)`;
      actionLine =
        "Please share a quick update on your progress and any blockers.";
    } else if (daysLeft === 0) {
      statusLine = `⚠️ **Due today** (**${dueDate}**)`;
      actionLine =
        "Please complete the issue today or comment with any blockers.";
    } else {
      statusLine = `🚨 **Overdue by ${Math.abs(
        daysLeft
      )} day(s)** (was due on **${dueDate}**)`;

      actionLine =
        "Please complete this issue **ASAP**. If there is no progress update, the issue may be **reassigned**.";
    }

    const body = `${dailyMarker}
⏰ **Daily Reminder** — ${difficultyLabel}

- 👤 Assigned on: **${assignedDate}**
- ⏳ SLA: **${slaDays} day(s)**
- 📅 ${statusLine}

${mentions}

${actionLine}
`;

    await github.rest.issues.createComment({
      owner,
      repo,
      issue_number: issue.number,
      body,
    });
  }
};
