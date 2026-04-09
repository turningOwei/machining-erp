import React from 'react';
import Dashboard from './Dashboard';

// 生产工作看板 - 继承 Dashboard，隐藏费用字段
const ProductionDashboard: React.FC<any> = (props) => {
  return <Dashboard {...props} hideCostFields={true} />;
};

export default ProductionDashboard;