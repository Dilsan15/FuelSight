import { useState } from 'react'
import { useAuthContext } from '@/Hooks/AuthHooks/useAuthContext'
import UserFinder from '@/APIs/userAPI'

export const useLogin = () => {

	const [error, setError] = useState(null)
	const [isLoading, setIsLoading] = useState(null)
	const { dispatch } = useAuthContext()

	const login = async (username, password) => {
		setIsLoading(true)
	
		try{
			const response = await UserFinder.post('/login', { username, password })
		
			if (response.status==200) {
				localStorage.setItem('user', JSON.stringify(response.data))
				dispatch({type: 'LOGIN', payload:response.data})
				setIsLoading(false)
				return true
			} 
		
		} catch(err){
			setError(err.response.data.error)		
			setIsLoading(false)
			return false
		}
    
  	}

  return { login, isLoading, error }
}