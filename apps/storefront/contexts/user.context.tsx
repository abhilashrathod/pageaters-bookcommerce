import {createContext, FC, useContext, useState} from 'react'
import {IUser} from "../schemas/user";

export interface UserContext {
  user?: IUser
  setUser: (user?: IUser) => void
}

export const UserContextImpl = createContext<UserContext>(null!);

export function useUser() {
  return useContext(UserContextImpl)
}

interface Props {
  initialUser?: IUser
}

export const UserProvider: FC<Props> = ({children, initialUser}) => {
  const [user, setUser] = useState(initialUser);

  return <UserContextImpl.Provider value={{user, setUser}}>{children}</UserContextImpl.Provider>
};
