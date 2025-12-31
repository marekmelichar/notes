import React from 'react';
import { Navigate } from 'react-router-dom';
import { ROUTE_HOME } from '@/config';

const NotFoundPage = () => {
  return <Navigate to={ROUTE_HOME} />;
};

export default NotFoundPage;
