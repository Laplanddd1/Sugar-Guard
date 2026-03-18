import { Article, DiabetesTypeInfo, Doctor } from './types';

export const MOCK_ARTICLES: Article[] = [
  {
    id: '1',
    title: '糖尿病患者的夏季饮食指南',
    summary: '从控糖主食、清淡烹调到补水补盐，帮你把“热天控糖”做得更稳。',
    content: '夏季出汗多、食欲波动大，血糖更容易出现“忽高忽低”。饮食上建议把主食从精米面逐步换成全谷物或杂豆（例如糙米、燕麦、荞麦），并把水果放在两餐之间少量分次吃。蔬菜尽量占到每餐的一半以上，优先选择含水量高、升糖负担低的品种（黄瓜、番茄、生菜、菌菇类等）。烹调方式以清蒸、凉拌、炖煮为主，减少油炸、糖醋、浓稠勾芡。饮水方面可以选择白水、淡茶或无糖苏打水，运动出汗较多时注意电解质补充，避免用含糖饮料“解渴”。如果近期出现口渴明显、夜尿增多或体重异常变化，建议及时监测空腹/餐后血糖并咨询医生。',
    author: '李医生',
    date: '2026.3.20',
    category: 'diet',
    imageUrl: 'https://picsum.photos/400/200?random=1'
  },
  {
    id: '2',
    title: '最新研究：运动对II型糖尿病的逆转作用',
    summary: '规律运动能提高胰岛素敏感性，关键是“可长期坚持”的强度与节奏。',
    content: '越来越多的证据提示：对部分早期 2 型糖尿病人群，生活方式干预可以显著改善血糖甚至达到长期缓解。更实用的做法不是一次练到很累，而是把运动拆成可执行的习惯：每周至少 150 分钟中等强度有氧（快走、骑行、游泳任选其一），并搭配每周 2 次力量训练（深蹲、俯卧撑、弹力带训练等）。饭后 10–20 分钟的轻量步行，对降低餐后血糖特别友好。若你有膝关节不适或体重偏高，优先选择游泳/椭圆机等低冲击运动。开始前建议评估血压、足部情况及用药方案，避免低血糖风险。',
    author: '王教授',
    date: '2026.3.18',
    category: 'exercise',
    imageUrl: 'https://picsum.photos/400/200?random=2'
  },
  {
    id: '3',
    title: '胰岛素泵的使用误区',
    summary: '从更换耗材到基础率调节，避开常见坑，才能让泵真正“省心”。',
    content: '胰岛素泵可以更精细地控制基础胰岛素与餐时追加，但前提是参数设置合理、耗材管理规范。常见问题包括：输注管路/针头更换不及时导致堵塞或吸收不稳定；仅依赖经验不复盘血糖曲线，长期忽略基础率的微调；输注部位反复在同一处，出现硬结影响吸收；洗澡或运动时未处理好防水与固定导致脱落。建议固定一个“每周回顾”时间，结合连续血糖监测或指尖血糖记录，和医生/教育护士一起逐步微调基础率、碳水系数与校正系数。一旦出现不明原因高血糖、输注部位红肿疼痛或泵报警频繁，应优先排查管路与耗材，再考虑参数问题。',
    author: '张护士长',
    date: '2026.3.15',
    category: 'medical',
    imageUrl: 'https://picsum.photos/400/200?random=3'
  }
];

export const MOCK_DOCTORS: Doctor[] = [
  { id: 'd1', name: '刘专家', specialty: '内分泌科', hospital: '市中心医院', avatar: 'https://picsum.photos/100/100?random=4', isOnline: true },
  { id: 'd2', name: '陈医师', specialty: '营养科', hospital: '第一人民医院', avatar: 'https://picsum.photos/100/100?random=5', isOnline: false },
  { id: 'd3', name: '赵主任', specialty: '糖尿病专科', hospital: '仁爱医院', avatar: 'https://picsum.photos/100/100?random=6', isOnline: true },
];

export const DIABETES_TYPES: DiabetesTypeInfo[] = [
  {
    id: 'type1',
    name: '1型糖尿病',
    mechanism: '自身免疫系统破坏了胰腺中的胰岛β细胞，导致胰岛素绝对缺乏。',
    symptoms: ['多饮', '多尿', '多食', '体重下降', '疲乏无力'],
    treatment: ['必须终身依赖外源性胰岛素治疗', '饮食控制', '运动疗法']
  },
  {
    id: 'type2',
    name: '2型糖尿病',
    mechanism: '胰岛素抵抗（细胞对胰岛素反应不佳）和胰岛素分泌相对不足。',
    symptoms: ['早期可能无症状', '视力模糊', '伤口愈合慢', '手脚麻木', '三多一少症状'],
    treatment: ['生活方式干预（饮食+运动）', '口服降糖药', '必要时使用胰岛素']
  },
  {
    id: 'gestational',
    name: '妊娠糖尿病',
    mechanism: '妊娠期间胎盘分泌的激素拮抗胰岛素，导致血糖升高。',
    symptoms: ['通常无明显症状', '产检时发现高血糖'],
    treatment: ['严格的饮食控制', '适量运动', '必要时使用胰岛素（通常不用口服药以免影响胎儿）']
  }
];
