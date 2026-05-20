import { useOperatorScope } from '../context/OperatorScopeContext';

export function useOperatorHubPaths() {
  const { hubBasePath, inOperatorHub, operatorId } = useOperatorScope();

  return {
    operatorId,
    inOperatorHub,
    hubBasePath,
    dashboard: `${hubBasePath}`,
    booking: `${hubBasePath}/booking`,
    bookingSearch: `${hubBasePath}/booking/search`,
    bookingSeats: (tripId) => `${hubBasePath}/booking/seats/${tripId}`,
    bookingSummary: `${hubBasePath}/booking/summary`,
    bookingConfirm: `${hubBasePath}/booking/confirm`,
    bookingManage: `${hubBasePath}/booking/manage`,
  };
}
