exports.updateTrustScore = (user) => {
    // Simple, explainable logic:
    // Each verified transaction increases trust
  
    const baseScore = 50;
    const bonus = user.totalTransactions * 5;
  
    return Math.min(baseScore + bonus, 100);
  };
  