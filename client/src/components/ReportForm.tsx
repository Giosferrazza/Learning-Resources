import StubForm from './StubForm'

// S1-10 Report a broken link or resource
// TODO(S1-10-T01): reason picker (broken link, inaccurate, inappropriate) + details
// TODO(S1-10-T03): confirmation and error messages
export default function ReportForm() {
  return (
    <StubForm
      title="Report a problem"
      tasks="S1-10-T01, S1-10-T03"
      submitLabel="Send report"
      fields={[
        { name: 'reason', label: 'Reason' },
        { name: 'details', label: 'Details' },
      ]}
    />
  )
}
