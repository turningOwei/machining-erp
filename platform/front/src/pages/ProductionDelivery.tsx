import React from 'react';
import Delivery from './Delivery';

// 生产送货管理 - 继承 Delivery，隐藏费用字段
const ProductionDelivery: React.FC<any> = (props) => {
  return <Delivery {...props} hideCostFields={true} />;
};

export default ProductionDelivery;