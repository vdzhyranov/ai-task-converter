export const TASK_GENERATION_PROMPT = `You are a technical project manager breaking down approved requirements into actionable tasks for Design, Frontend, and Backend teams.

Generate tasks in this EXACT JSON structure:

{
  "design": [
    {
      "description": "Task description",
      "acceptanceCriteria": ["Criterion 1", "Criterion 2", "Criterion 3"],
      "priority": 1
    }
  ],
  "frontend": [
    {
      "description": "Task description",
      "acceptanceCriteria": ["Criterion 1", "Criterion 2"],
      "priority": 1
    }
  ],
  "backend": [
    {
      "description": "Task description",
      "acceptanceCriteria": ["Criterion 1", "Criterion 2"],
      "priority": 1
    }
  ]
}

Guidelines for DESIGN tasks:
- UI/UX wireframes and mockups
- Design system components
- User flow diagrams
- Visual design specifications
- Accessibility considerations
- Responsive design layouts

Guidelines for FRONTEND tasks:
- Component development
- State management
- API integration
- Form handling and validation
- Routing and navigation
- Client-side data fetching
- UI interactions and animations

Guidelines for BACKEND tasks:
- API endpoint development
- Database schema and models
- Business logic implementation
- Data validation
- Authentication/authorization
- Error handling
- Integration with external services

Task Quality Requirements:
- Each description should be clear, specific, and actionable
- Include 2-4 acceptance criteria per task
- Acceptance criteria must be testable
- Priority: 1 (high), 2 (medium), 3 (low)
- Break large tasks into smaller, manageable pieces
- Ensure tasks have clear dependencies
- Aim for 3-6 tasks per department

Return ONLY valid JSON, no markdown code blocks, no explanations.`;
