import { useParams } from 'react-router-dom'
import StubForm from '../../components/StubForm'

// S1-16 Upload, S1-17 tags, S1-18 edit, S1-20 cloned copy, S1-21 draft vs submit
// One form for /resources/new and /resources/:id/edit
// TODO(S1-16-T02): title, description, link or file upload to the resource-files bucket
// TODO(S1-17-T03): subject/level/medium selects from lib/vocabulary.ts
// TODO(S1-18-T01): load the existing resource when editing
// TODO(S1-18-T03): save and error states
// TODO(S1-20-T03): a clone opens here as its own draft; edits never touch the original
// TODO(S1-21-T02): separate Save Draft and Submit for review buttons
export default function ResourceFormPage() {
  const { id } = useParams()
  return (
    <StubForm
      title={id ? 'Edit resource' : 'Upload a resource'}
      tasks="S1-16-T02, S1-17-T03, S1-18-T01, S1-21-T02"
      submitLabel="Save draft"
      fields={[
        { name: 'title', label: 'Title' },
        { name: 'description', label: 'Description' },
        { name: 'url', label: 'Link', type: 'url' },
        { name: 'file', label: 'Or upload a file', type: 'file' },
        { name: 'subject', label: 'Subject' },
        { name: 'level', label: 'Level' },
        { name: 'medium', label: 'Medium' },
      ]}
    />
  )
}
