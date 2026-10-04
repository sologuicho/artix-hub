import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

import { BACKEND_URL } from '../config/client'

const NotificationContext = createContext()

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const socketRef = useRef(null)

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/notifications`, {
        credentials: 'include',
      })
      const data = await response.json()
      if (data.ok) {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching notifications:', error)
    }
  }

  useEffect(() => {
    if (!isAuthenticated() || !user) {
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotifications([])
      setUnreadCount(0)
      return
    }

    let cancelled = false

    const connect = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/auth/socket-token`, {
          credentials: 'include',
        })
        if (!response.ok || cancelled) return
        const data = await response.json()
        if (!data.ok || !data.token || cancelled) return

        const newSocket = io(BACKEND_URL, {
          auth: { token: data.token },
          transports: ['websocket', 'polling'],
        })

        newSocket.on('connect', () => {
          // eslint-disable-next-line no-console
          console.log('Connected to notification server')
        })

        newSocket.on('notification', notification => {
          setNotifications(prev => [notification, ...prev])
          setUnreadCount(prev => prev + 1)

          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/favicon.ico',
            })
          }
        })

        newSocket.on('disconnect', () => {
          // eslint-disable-next-line no-console
          console.log('Disconnected from notification server')
        })

        if (cancelled) {
          newSocket.close()
          return
        }

        socketRef.current = newSocket
        fetchNotifications()
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Socket setup failed:', error)
      }
    }

    connect()

    return () => {
      cancelled = true
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAuthenticated()])

  const markAsRead = async id => {
    try {
      const getCsrfToken = () => {
        const cookies = document.cookie.split(';')
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=')
          if (name === 'csrf') return value
        }
        return null
      }

      const response = await fetch(`${BACKEND_URL}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          'x-csrf-token': getCsrfToken() || '',
        },
        credentials: 'include',
      })

      if (response.ok) {
        setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const getCsrfToken = () => {
        const cookies = document.cookie.split(';')
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=')
          if (name === 'csrf') return value
        }
        return null
      }

      const response = await fetch(`${BACKEND_URL}/api/notifications/read-all`, {
        method: 'PUT',
        headers: {
          'x-csrf-token': getCsrfToken() || '',
        },
        credentials: 'include',
      })

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error marking all as read:', error)
    }
  }

  const requestPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        fetchNotifications,
        requestPermission,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}
