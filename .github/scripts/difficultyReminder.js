
module.exports = async ({ github, context }) => {
  const owner = context.repo.owner;
  const repo = context.repo.repo;

  // SLA duration based on issue difficulty (calendar days)
  const SLA = {
    "difficulty: easy": 2,
    "difficulty: medium": 4,
    "difficulty: hard": 7,
  };

  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  // Use UTC dates consistently
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  const dayStamp = today.toISOString().slice(0, 10);
  const dailyMarker = `<!-- daily-difficulty-reminder:${dayStamp} -->`;

  // Add calendar days to a date
  const addDaysUTC = (date, days) => {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  };

  const isoDate = (date) => date.toISOString().slice(0, 10);

  // Fetch all open issues
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
    try {
      // Skip pull requests
      if (issue.pull_request) continue;

      // Extract issue labels
      const labels = (issue.labels || []).map((label) =>
        typeof label === "string" ? label : label.name
      );

      // Find difficulty label
      const difficultyLabel = Object.keys(SLA).find((label) =>
        labels.includes(label)
      );

      if (!difficultyLabel) continue;

      // Get assigned users
      const assignees = (issue.assignees || []).map(
        (assignee) => assignee.login
      );

      // Skip unassigned issues
      if (assignees.length === 0) continue;

      const slaDays = SLA[difficultyLabel];

      // Fetch issue events to determine assignment date
      const events = await github.paginate(
        github.rest.issues.listEvents,
        {
          owner,
          repo,
          issue_number: issue.number,
          per_page: 100,
        }
      );

      // Find the most recent assignment event
      const assignedEvents = events
        .filter(
          (event) =>
            event.event === "assigned" && event.created_at
        )
        .sort(
          (a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
        );

      // Use issue creation date if no assignment event exists
      const assignedAt = assignedEvents.length
        ? new Date(assignedEvents[0].created_at)
        : new Date(issue.created_at);

      if (Number.isNaN(assignedAt.getTime())) {
        console.log(`Skipping issue #${issue.number}: invalid assignment date.`);
        continue;
      }

      // Calculate SLA deadline
      const assignedDate = new Date(
        Date.UTC(
          assignedAt.getUTCFullYear(),
          assignedAt.getUTCMonth(),
          assignedAt.getUTCDate()
        )
      );

      const dueAt = addDaysUTC(assignedDate, slaDays);

      const daysLeft = Math.round(
        (dueAt.getTime() - today.getTime()) / MS_PER_DAY
      );

      const assignedDateStr = isoDate(assignedDate);
      const dueDateStr = isoDate(dueAt);

      // Fetch existing comments
      const comments = await github.paginate(
        github.rest.issues.listComments,
        {
          owner,
          repo,
          issue_number: issue.number,
          per_page: 100,
        }
      );

      // Prevent duplicate reminders on the same day
      const alreadyReminded = comments.some((comment) =>
        (comment.body || "").includes(dailyMarker)
      );

      if (alreadyReminded) continue;

      // Format assignee mentions
      const mentions = assignees
        .map((username) => `@${username}`)
        .join(" ");

      let statusLine;
      let actionLine;

      if (daysLeft > 0) {
        statusLine =
          `✅ **${daysLeft} day(s) left** ` +
          `(due on **${dueDateStr}**)`;

        actionLine =
          "Please share a quick update about your progress and any blockers.";

      } else if (daysLeft === 0) {
        statusLine =
          `⚠️ **Due today** (**${dueDateStr}**)`;

        actionLine =
          "Please complete this issue today or report any blockers.";

      } else {
        statusLine =
          `🚨 **Overdue by ${Math.abs(daysLeft)} day(s)** ` +
          `(was due on **${dueDateStr}**)`;

        actionLine =
          "Please complete this issue as soon as possible. " +
          "If there is no progress update, this issue may be reassigned.";
      }

      // Construct daily reminder comment
      const body = `${dailyMarker}

⏰ **Daily Reminder** — ${difficultyLabel}

- Assigned on: **${assignedDateStr}**
- SLA: **${slaDays} days**
- ${statusLine}

${mentions}

${actionLine}
`;

      // Post reminder comment
      await github.rest.issues.createComment({
        owner,
        repo,
        issue_number: issue.number,
        body,
      });

      console.log(
        `Successfully posted daily reminder on issue #${issue.number}`
      );

    } catch (error) {
      console.error(
        `Failed to process issue #${issue.number}:`,
        error.message
      );

      // Continue processing other issues
      continue;
    }
  }

  console.log("Daily difficulty reminder process completed.");
};
