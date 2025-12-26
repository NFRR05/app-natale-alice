// Utility functions for displaying user avatars

export const getInitials = (name) => {
  if (!name) return '?'
  const parts = name.split(' ').filter(n => n.length > 0)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2)
}

export const getAvatarColor = (str) => {
  if (!str) return 'from-gray-400 to-gray-500'
  const colors = [
    'from-pink-400 to-rose-500',
    'from-violet-400 to-purple-500',
    'from-blue-400 to-cyan-500',
    'from-emerald-400 to-teal-500',
    'from-amber-400 to-orange-500',
    'from-red-400 to-pink-500',
  ]
  const index = str.charCodeAt(0) % colors.length
  return colors[index]
}

// Avatar component helper - returns JSX for user avatar
export const UserAvatar = ({ user, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-32 h-32 text-4xl'
  }
  
  const sizeClass = sizeClasses[size] || sizeClasses.md
  const displayName = user?.display_name || user?.username || user?.email?.split('@')[0] || '?'
  const initials = getInitials(displayName)
  const colorClass = getAvatarColor(user?.username || displayName)
  
  if (user?.profile_picture_url) {
    return (
      <div className={`${sizeClass.split(' ')[0]} ${sizeClass.split(' ')[1]} rounded-full overflow-hidden border-2 border-pink-200`}>
        <img 
          src={user.profile_picture_url} 
          alt={displayName}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }
  
  return (
    <div className={`${sizeClass.split(' ')[0]} ${sizeClass.split(' ')[1]} rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center border-2 border-pink-200`}>
      <span className="text-white font-bold">
        {initials}
      </span>
    </div>
  )
}

