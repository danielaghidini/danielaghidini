const fs = require("fs");
const path = require("path");

const USERNAME = "danielaghidini";
const TOKEN = process.env.GITHUB_TOKEN;

if (!TOKEN) {
  console.error("Error: GITHUB_TOKEN is not defined.");
  process.exit(1);
}

const query = `
  query($username: String!) {
    user(login: $username) {
      contributionsCollection {
        totalCommitContributions
        restrictedContributionsCount
      }
      pullRequests(first: 1) {
        totalCount
      }
      issues(first: 1) {
        totalCount
      }
      followers {
        totalCount
      }
    }
  }
`;

async function fetchStats() {
  try {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables: { username: USERNAME } }),
    });

    const data = await response.json();

    if (data.errors) {
      console.error("GraphQL Errors:", data.errors);
      process.exit(1);
    }

    return data.data.user;
  } catch (error) {
    console.error("Fetch Error:", error);
    process.exit(1);
  }
}

async function updateReadme(stats) {
  const readmePath = path.join(__dirname, "../README.md");

  // Check if README exists, if not try README_IDE.md or fail gracefully
  let targetPath = readmePath;
  if (!fs.existsSync(readmePath)) {
    console.log("README.md not found, checking for README_IDE.md in parent...");
    // Adjust path logic depending on where script runs. Assuming strict structure.
    // For this task, we assume the user will rename README_IDE.md to README.md
  }

  try {
    // Read the file assuming it is README.md in the root
    let content = fs.readFileSync(readmePath, "utf8");

    const commits =
      stats.contributionsCollection.totalCommitContributions +
      stats.contributionsCollection.restrictedContributionsCount;
    const prs = stats.pullRequests.totalCount;
    const issues = stats.issues.totalCount;
    // Simple streak logic placeholder or just "Active"
    const streak = "On Fire! 🔥";

    const newStatsBlock = `<!-- STATS:START -->
\`\`\`bash
> ${USERNAME} --stats

   Commits:    ${commits.toLocaleString()} (This Year)
   PRs:        ${prs.toLocaleString()} Created
   Issues:     ${issues.toLocaleString()} Created
   Streak:     ${streak}
\`\`\`
<!-- STATS:END -->`;

    const regex = /<!-- STATS:START -->[\s\S]*<!-- STATS:END -->/;

    if (!regex.test(content)) {
      console.error("Could not find <!-- STATS:START --> markers in README.md");
      return;
    }

    const newContent = content.replace(regex, newStatsBlock);

    if (newContent !== content) {
      fs.writeFileSync(readmePath, newContent);
      console.log("README.md updated successfully!");
    } else {
      console.log("No changes needed.");
    }
  } catch (err) {
    console.error("Error updating file:", err);
  }
}

async function main() {
  const stats = await fetchStats();
  console.log("Fetched Stats:", stats);
  await updateReadme(stats);
}

main();
