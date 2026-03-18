# DOING

_One task at a time. If this file has a task in it, resume it before picking anything new._

### [D-003] Public Spending — Restructure into subtopics with sidebar
- **Topic:** spending (restructure existing single page into subtopic structure)
- **Direction:** The spending pillar currently has one monolithic page. Break it into subtopics with a sidebar, following the same pattern as healthcare and housing. This task is structural only, no new data.
  - **Overview** — move the existing Spending.jsx content here: COFOG pie chart, departmental breakdown, receipts vs spending, net debt, tax calculator. Rename the component to `SpendingOverview.jsx`.
  - **Taxation** — create a placeholder subtopic (Placeholder component). Will be built in D-004.
  - **Local Government** — create a placeholder subtopic. Will be built in D-005.
  - Update `src/pillars/config.js` to give spending subtopics
  - Update `src/App.jsx` with the new imports and routes
  - The existing tax receipts bar chart can stay in Overview or move to Taxation, use judgement
- **Priority:** High
- **Notes:** The existing Spending.jsx is ~1100 lines with a tax calculator feature that must be preserved. This is a refactor, not new content. Keep the existing data file (`public/data/spending.json`) unchanged.
