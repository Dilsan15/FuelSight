import { useState } from 'react'
import { useAuthContext } from '@/Hooks/AuthHooks/useAuthContext'
import UserFinder from '@/APIs/userAPI'

export const useLogin = () => {

	const [error, setError] = useState(null)
	const [isLoading, setIsLoading] = useState(null)
	const [shiftWarning, setShiftWarning] = useState(null)
	const { dispatch } = useAuthContext()

	const login = async (username, password, adminOverride = false) => {
		setIsLoading(true)
		setError(null)
		setShiftWarning(null)
	
		try{
			const response = await UserFinder.post('/login', { 
				username, 
				password, 
				adminOverride 
			})
		
			if (response.status === 200) {
				localStorage.setItem('user', JSON.stringify(response.data))
				dispatch({type: 'LOGIN', payload: response.data})
				setIsLoading(false)
				return true
			} 
		
		} catch(err){
			if (err.response?.data?.error === 'RECENT_SHIFT_WARNING') {
				setShiftWarning(err.response.data)
			} else {
				setError(err.response?.data?.error || 'Login failed')
			}
			setIsLoading(false)
			return false
		}
    
  	}

	const clearWarning = () => {
		setShiftWarning(null)
		setError(null)
	}

  return { 
	login, 
	isLoading, 
	error, 
	shiftWarning, 
	clearWarning 
  }
}