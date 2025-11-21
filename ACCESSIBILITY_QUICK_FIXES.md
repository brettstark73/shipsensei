# Critical A11y Quick Fixes for ShipSensei

## Priority Order for MVP Launch (15-21 Hours Total)

### 1. Replace Browser Dialogs (6-8 Hours) - CRITICAL

This is the single biggest impact fix. Currently using native browser dialogs which are:
- Not accessible
- Block all interaction
- Poor mobile UX
- Cannot be styled

**Locations to Fix:**

#### File: `/src/app/dashboard/page.tsx` (Line 63)
```tsx
// CURRENT (❌ BAD)
const deleteProject = async (projectId: string, projectName: string) => {
  const confirmed = confirm(
    `Are you sure you want to delete "${projectName}"?\n\nThis will permanently delete...`
  )
  
  if (!confirmed) return
  // ... delete logic
}

// SHOULD BE (✅ GOOD)
// Create a reusable ConfirmDialog component:

// components/ConfirmDialog.tsx
'use client'
import { useState } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => Promise<void> | void
  onCancel: () => void
  isDestructive?: boolean
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false,
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  if (!open) return null

  const handleConfirm = async () => {
    try {
      setIsLoading(true)
      await onConfirm()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      role="presentation"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
        role="alertdialog"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 id="dialog-title" className="text-lg font-bold text-gray-900">
            {title}
          </h2>
          <p id="dialog-description" className="mt-2 text-gray-600">
            {description}
          </p>
        </div>

        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg text-white font-medium ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
                : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400'
            }`}
          >
            {isLoading ? 'Loading...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

// Then in dashboard/page.tsx:
const [deleteConfirm, setDeleteConfirm] = useState<{
  open: boolean
  projectId?: string
  projectName?: string
}>({ open: false })

<ConfirmDialog
  open={deleteConfirm.open}
  title="Delete Project"
  description={`Are you sure you want to delete "${deleteConfirm.projectName}"?\n\nThis will permanently delete the project and all its requirements. This action cannot be undone.\n\nNote: This will NOT delete your GitHub repository or Vercel deployment.`}
  confirmText="Delete"
  cancelText="Cancel"
  onConfirm={() => deleteConfirm.projectId && deleteProject(deleteConfirm.projectId)}
  onCancel={() => setDeleteConfirm({ open: false })}
  isDestructive
/>
```

#### File: `/src/app/projects/[id]/page.tsx` (Lines 227, 270, 241)

```tsx
// CURRENT (❌ BAD)
alert(`Success! Your project has been generated and pushed to GitHub:\n\n${data.repository.url}`)

const vercelToken = prompt('Enter your Vercel API Token:\n\n...')

// SHOULD USE:
// 1. Toast notification for success
import { useNotification } from '@/lib/notification-provider'

const { showNotification } = useNotification()

// Replace alert
showNotification('success', 
  `Project generated! View on GitHub: ${data.repository.url}`, 
  5000
)

// 2. Form modal for token input (better UX)
// Create: components/VercelTokenModal.tsx

interface VercelTokenModalProps {
  open: boolean
  onSubmit: (token: string) => Promise<void>
  onCancel: () => void
}

export function VercelTokenModal({ open, onSubmit, onCancel }: VercelTokenModalProps) {
  const [token, setToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!token.trim()) {
      setError('Token is required')
      return
    }

    try {
      setIsLoading(true)
      await onSubmit(token.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deploy')
    } finally {
      setIsLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Deploy to Vercel
            </h2>

            <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
              Vercel API Token
            </label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="Enter your Vercel API token"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
              aria-invalid={!!error}
              aria-describedby={error ? 'token-error' : undefined}
              disabled={isLoading}
            />

            {error && (
              <p id="token-error" className="mt-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <p className="mt-3 text-sm text-gray-600">
              Create a token at{' '}
              <a 
                href="https://vercel.com/account/tokens" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                vercel.com/account/tokens
              </a>
              {' '}with deployments:write scope
            </p>
          </div>

          <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !token.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
            >
              {isLoading ? 'Deploying...' : 'Deploy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

---

### 2. Convert Clickable Divs to Buttons (3-4 Hours) - CRITICAL

Replace all `<div onClick>` patterns with semantic `<button>` or `<a>` elements.

#### File: `/src/app/dashboard/page.tsx` (Line 282-383)

```tsx
// CURRENT (❌ BAD)
<div
  key={project.id}
  onClick={() => router.push(`/projects/${project.id}`)}
  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition relative"
>
  <div
    onClick={() => router.push(`/projects/${project.id}`)}
    className="cursor-pointer"
  >
    {/* project content */}
  </div>

  {/* delete button */}
  <button
    onClick={e => {
      e.stopPropagation()
      deleteProject(project.id, project.name)
    }}
  >
    Delete
  </button>
</div>

// SHOULD BE (✅ GOOD)
<div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
  <button
    onClick={() => router.push(`/projects/${project.id}`)}
    className="text-left w-full p-6 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-inset"
    aria-label={`View project: ${project.name}`}
  >
    <div className="flex justify-between items-start mb-4">
      <h3 className="text-xl font-semibold text-gray-900 flex-1 pr-2">
        {project.name}
      </h3>
      <div className="flex gap-2 items-center">
        {getStatusBadge(project.status)}
      </div>
    </div>

    {project.description && (
      <p className="text-gray-600 mb-4 line-clamp-2">
        {project.description}
      </p>
    )}

    {/* rest of content */}
  </button>

  {/* delete button - outside click handler */}
  <div className="px-6 pb-4 border-t border-gray-100 flex justify-end">
    <button
      onClick={() => setDeleteConfirm({ 
        open: true, 
        projectId: project.id, 
        projectName: project.name 
      })}
      disabled={deletingId === project.id}
      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
      aria-label="Delete project"
    >
      {/* icon */}
    </button>
  </div>
</div>
```

#### File: `/src/app/page.tsx` (Feature Cards)

```tsx
// CURRENT (❌ BAD)
<div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition border border-gray-100">
  <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
    <svg className="w-8 h-8 text-blue-600" {...} />
  </div>
  <h3 className="text-xl font-bold text-gray-900 mb-3">
    AI Requirements Discovery
  </h3>
  <p className="text-gray-600">...</p>
</div>

// SHOULD BE (✅ GOOD)
<article className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition border border-gray-100">
  <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
    <svg 
      className="w-8 h-8 text-blue-600" 
      aria-hidden="true"
      {...} 
    />
  </div>
  <h3 className="text-xl font-bold text-gray-900 mb-3">
    AI Requirements Discovery
  </h3>
  <p className="text-gray-600">...</p>
</article>
```

---

### 3. Add ARIA Labels & Roles (2-3 Hours) - CRITICAL

Add missing ARIA attributes to interactive elements and complex components.

#### File: `/src/app/dashboard/page.tsx`

```tsx
// Status Badge - needs role
<span
  className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors]}`}
  role="status"
  aria-label={`Project status: ${status}`}
>
  {status}
</span>

// Delete Button - needs aria-label
<button
  onClick={() => deleteProject(project.id, project.name)}
  disabled={deletingId === project.id}
  className="..."
  aria-label={`Delete project "${project.name}"`}
  title={`Delete project "${project.name}"`}
>
  {/* icon */}
</button>

// Loading Spinner - needs aria-label
<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" aria-label="Loading" role="status" />
```

#### File: `/src/app/projects/[id]/page.tsx`

```tsx
// Chat avatars
<div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold" aria-label="AI assistant">
  AI
</div>

// Status badge
<span
  className={`px-3 py-1 rounded-full text-sm font-medium ${...}`}
  role="status"
>
  {project.status}
</span>

// Progress bar
<div className="w-full bg-gray-200 rounded-full h-2">
  <div
    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
    style={{ width: `${(answeredCount / project.requirements.length) * 100}%` }}
    role="progressbar"
    aria-valuenow={answeredCount}
    aria-valuemin={0}
    aria-valuemax={project.requirements.length}
    aria-label={`Progress: ${answeredCount} of ${project.requirements.length} questions answered`}
  />
</div>
```

#### File: `/src/app/projects/new/page.tsx`

```tsx
// Link back button - add aria-label
<button
  onClick={() => router.push('/dashboard')}
  className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
  aria-label="Return to dashboard"
>
  <span className="mr-2" aria-hidden="true">←</span>
  Back to Dashboard
</button>

// Form error - link to input
<div className="mb-6">
  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
    Project Name *
  </label>
  <input
    id="name"
    type="text"
    aria-invalid={!!error}
    aria-describedby={error ? 'name-error' : undefined}
    value={name}
    onChange={e => setName(e.target.value)}
  />
  {error && (
    <p id="name-error" className="text-red-600 text-sm mt-1">
      {error}
    </p>
  )}
</div>
```

---

### 4. Add Focus States to Buttons (0.5-1 Hour) - Quick Win

Add `focus:ring-2 focus:ring-offset-2` to all buttons for keyboard navigation.

#### File: All Pages

```tsx
// CURRENT (❌)
<button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">

// SHOULD BE (✅)
<button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition">
```

Apply to:
- Home page: Get Started button (multiple instances)
- Dashboard: New Project button, Delete button, Sign out button
- New Project page: Create button, Cancel button
- Project Detail page: All action buttons

**Quick find/replace pattern:**
```
Find: hover:bg-blue-700 transition
Replace: hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition
```

---

## Implementation Priority

1. **Day 1 (6-8h):** Replace browser dialogs with modal components
2. **Day 2 (3-4h):** Convert clickable divs to buttons
3. **Day 3 (2-3h):** Add ARIA labels and roles
4. **Day 3-4 (1-2h):** Add focus states and polish

**Total: 12-17 hours for 80-90% of critical issues**

---

## Testing Checklist After Implementation

- [ ] Test with keyboard only (Tab, Enter, Escape)
- [ ] Test with screen reader (NVDA, JAWS, VoiceOver)
- [ ] Verify all buttons have visible focus indicator
- [ ] Verify all dialogs can be closed with Escape key
- [ ] Verify touch targets are at least 44x44px
- [ ] Verify no content is hidden at any zoom level
- [ ] Verify error messages are associated with inputs

---

**Related Documentation:** See `/home/user/shipsensei/ACCESSIBILITY_REVIEW.md` for comprehensive analysis
