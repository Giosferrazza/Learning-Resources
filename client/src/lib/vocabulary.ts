// S1-17 Tag resources by subject, level and medium
// TODO(S1-17-T01): agree on the real vocabulary; the server and questionnaire must use the same values
export const subjects = ['programming', 'data', 'design', 'business'] as const
export const levels = ['beginner', 'intermediate', 'advanced'] as const
export const media = ['video', 'article', 'course', 'tool'] as const

// TODO(S1-33-T01): define learning goals and how each one affects matching
export const goals = ['get-started', 'pass-a-course', 'build-a-project', 'career-change'] as const
