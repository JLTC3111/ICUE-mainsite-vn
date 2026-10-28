import { useContext } from 'react'
import { SupportAlertsContext } from '../context/SupportAlertsContext'

export default function useSupportAlerts() {
  return useContext(SupportAlertsContext)
}
