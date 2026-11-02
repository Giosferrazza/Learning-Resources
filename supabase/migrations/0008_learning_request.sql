-- Nullable so questionnaires saved before this migration remain compatible.
alter table public.questionnaire_responses
  add column learning_request text
  check (char_length(learning_request) <= 500);
-- Existing ownership RLS policies also protect this column.
