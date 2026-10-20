import type { Goal, Level, Medium, Subject } from '../../../shared/vocabulary'

export type Role = 'student' | 'professor' | 'educator' | 'admin'

export type Profile = {
  id: string
  email: string
  display_name: string
  role: Role
  account_status: 'active' | 'suspended'
  walkthrough_completed_at: string | null
  created_at: string
}

export type ResourceStatus = 'draft' | 'pending' | 'published' | 'rejected' | 'removed'

export type Resource = {
  id: string
  owner_id?: string
  title: string
  description: string
  url: string | null
  file_path?: string | null
  file_url?: string | null
  subject: Subject | null
  level: Level | null
  medium: Medium | null
  goals: Goal[]
  status: ResourceStatus
  review_note?: string | null
  cloned_from?: string | null
  submitted_at?: string | null
  created_at: string
  updated_at: string
}

export type ResourceSummary = { id: string | null; title: string; subject: string | null; level: string | null; medium: string | null; available: boolean }

export type ListSummary = { id: string; name: string; share_token: string | null; itemCount: number; updated_at: string }

export type Notification = { id: string; type: string; message: string; resource_id: string | null; read_at: string | null; created_at: string }
