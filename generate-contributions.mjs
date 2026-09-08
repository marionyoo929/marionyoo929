import { writeFile } from "node:fs/promises";

const token = process.env.GH_TOKEN;
const username = process.env.GITHUB_USERNAME || "marionyoo929";
if (!token) throw new Error("GH_TOKEN is required");

const query = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          firstDay
          contributionDays { date weekday contributionCount contributionLevel }
        }
      }
    }
  }
}`;

const response = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query, variables: { login: username } }),
});
if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
const payload = await response.json();
if (payload.errors) throw new Error(JSON.stringify(payload.errors));

const calendar = payload.data.user.contributionsCollection.contributionCalendar;
const weeks = calendar.weeks.slice(-53);
const colors = {
  NONE: "#e5e5ec",
  FIRST_QUARTILE: "#d2d2ed",
  SECOND_QUARTILE: "#a8a8d7",
  THIRD_QUARTILE: "#7172b5",
  FOURTH_QUARTILE: "#17185f",
};
const cell = 10;
const gap = 3;
const startX = 67;
const startY = 110;

const cells = weeks.flatMap((week, x) => week.contributionDays.map((day) => {
  const px = startX + x * (cell + gap);
  const py = startY + day.weekday * (cell + gap);
  return `<rect x="${px}" y="${py}" width="${cell}" height="${cell}" rx="2.5" fill="${colors[day.contributionLevel]}" data-date="${day.date}" data-count="${day.contributionCount}"/>`;
})).join("");

let previousMonth = -1;
const monthLabels = weeks.map((week, index) => {
  const date = new Date(`${week.firstDay}T00:00:00Z`);
  const month = date.getUTCMonth();
  if (month === previousMonth) return "";
  previousMonth = month;
  const label = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  return `<text x="${startX + index * (cell + gap)}" y="99" font-family="Arial,sans-serif" font-size="10" fill="#73737c">${label}</text>`;
}).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="812" height="245" viewBox="0 0 812 245" role="img" aria-labelledby="title desc">
<title id="title">${calendar.totalContributions} GitHub contributions in the last year</title><desc id="desc">Contribution calendar for ${username}</desc>
<defs><filter id="shadow" x="-10%" y="-20%" width="120%" height="150%"><feDropShadow dx="2" dy="5" stdDeviation="3" flood-color="#000" flood-opacity=".18"/></filter></defs>
<rect width="812" height="245" fill="#fff"/>
<rect x="38" y="18" width="305" height="38" rx="19" fill="#fff" stroke="#8c8c91"/>
<text x="190.5" y="43" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="#35353c">${calendar.totalContributions} contributions in the last year</text>
<rect x="38" y="72" width="736" height="145" rx="8" fill="#f6f6f6" stroke="#55555c" stroke-width="2" filter="url(#shadow)"/>
${monthLabels}
<text x="46" y="137" font-family="Arial,sans-serif" font-size="9" fill="#73737c">Mon</text><text x="46" y="163" font-family="Arial,sans-serif" font-size="9" fill="#73737c">Wed</text><text x="46" y="189" font-family="Arial,sans-serif" font-size="9" fill="#73737c">Fri</text>
${cells}
<text x="650" y="207" font-family="Arial,sans-serif" font-size="9" fill="#73737c">Less</text><rect x="680" y="198" width="10" height="10" rx="2.5" fill="#e5e5ec"/><rect x="694" y="198" width="10" height="10" rx="2.5" fill="#d2d2ed"/><rect x="708" y="198" width="10" height="10" rx="2.5" fill="#a8a8d7"/><rect x="722" y="198" width="10" height="10" rx="2.5" fill="#7172b5"/><rect x="736" y="198" width="10" height="10" rx="2.5" fill="#17185f"/><text x="751" y="207" font-family="Arial,sans-serif" font-size="9" fill="#73737c">More</text>
</svg>`;

await writeFile("contribution.svg", svg, "utf8");
