export default {
  routes: [
    {
      method: 'GET',
      path: '/equipment-loans/:id/verify',
      handler: 'api::equipment-loan.equipment-loan.verifyIntegrity',
      config: { auth: false },
    },
  ],
};
