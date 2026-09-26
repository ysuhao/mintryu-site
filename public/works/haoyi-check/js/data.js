/* ===== 豪意值检测 · 题库与结果档位 ===== */
(function (root) {
  const QUESTIONS = [
    {
      id: 1,
      tag: '穿搭 · 虚空打碟本体',
      title: '朋友喊你出门，你打开衣柜，第一反应是穿——',
      options: [
        { key: 'A', text: '黑色连帽卫衣 + 黑色 3D 口罩，帽子拉到眉毛', score: 12 },
        { key: 'B', text: '全身黑但没戴口罩，觉得低调有格调', score: 8 },
        { key: 'C', text: '什么舒服穿什么，昨天那件没洗就今天再穿', score: 2 },
        { key: 'D', text: '亮色，我怕别人看不见我', score: 0 },
      ],
    },
    {
      id: 2,
      tag: '校园 · 名场面',
      title: '自习课老师说「谁想给大家放首歌」，你——',
      options: [
        { key: 'A', text: '起身放《The Spectre》，然后当众空气打碟一段', score: 12 },
        { key: 'B', text: '放歌但坐着，用脚打拍子，眼神放空', score: 7 },
        { key: 'C', text: '假装没听见，低头刷题', score: 1 },
        { key: 'D', text: '举手推荐别人放，自己绝不上', score: 3 },
      ],
    },
    {
      id: 3,
      tag: '行为 · 氛围感',
      title: '下雨天没带伞，从教学楼走到宿舍，你会——',
      options: [
        { key: 'A', text: '故意放慢脚步，任雨打在脸上，脑内 BGM 已响起', score: 12 },
        { key: 'B', text: '小跑但保持一个自认为帅的姿势', score: 6 },
        { key: 'C', text: '用书包顶着头狼狈狂奔', score: 1 },
        { key: 'D', text: '站原地等雨小，顺便刷会手机', score: 2 },
      ],
    },
    {
      id: 4,
      tag: '说话方式',
      title: '群里聊到一个话题，你的发言习惯是——',
      options: [
        { key: 'A', text: '中英夹杂 + 专业术语，「这个其实是个 trade-off 的 mindset」', score: 8 },
        { key: 'B', text: '偶尔冒一两个英文词，但会心虚地补中文解释', score: 4 },
        { key: 'C', text: '大白话，能说人话绝不绕', score: 0 },
        { key: 'D', text: '潜水，只发表情包', score: 1 },
      ],
    },
    {
      id: 5,
      tag: '游戏 · 三角洲嘉豪',
      title: '玩《三角洲行动》，你的配置是——',
      options: [
        { key: 'A', text: '威龙吴彦祖 + 嘉豪改枪（操控拉满弃稳定）+ 4:3 宽体 + 抄来的 M14/M7/AWM，一套连招后进场即被带走', score: 8 },
        { key: 'B', text: '抄了主播配置但打得还行，偶尔能苟到决赛圈', score: 5 },
        { key: 'C', text: '怎么稳怎么来，能吃鸡就行不管好不好看', score: 1 },
        { key: 'D', text: '不玩这个 / 随便躺', score: 0 },
      ],
    },
    {
      id: 6,
      tag: '社交平台 · 朋友圈',
      title: '发一条动态，你的文案通常是——',
      options: [
        { key: 'A', text: '三行小作文 + 一句英文歌词 + 定位到没人认识的小众地点', score: 8 },
        { key: 'B', text: '一句略带哲理的短句，配九宫格', score: 4 },
        { key: 'C', text: '直接「吃饭」+ 一张糊图', score: 1 },
        { key: 'D', text: '从不发，朋友圈三天可见且是空的', score: 0 },
      ],
    },
    {
      id: 7,
      tag: '科技/金融圈 · 死装型嘉豪',
      title: '别人问你最近在忙啥、看啥，你的回答是——',
      options: [
        { key: 'A', text: '「我很少刷短视频，主要用 TikTok 看 CNBC 和 Bloomberg 盘前；同龄人以为我熬夜打瓦，其实屏幕上跑的是 Python 量化模型和 K 线图」', score: 8 },
        { key: 'B', text: '用了半小时新 AI 模型，就开一个 12 条 thread「说几个大众没 get 到的点」', score: 6 },
        { key: 'C', text: '转发大 V 加一句「锐评」，其实就是复述', score: 4 },
        { key: 'D', text: '「就上班、摸鱼、睡觉」，实话实说', score: 0 },
      ],
    },
    {
      id: 8,
      tag: '耳机 · 氛围道具',
      title: '你和耳机的关系是——',
      options: [
        { key: 'A', text: '永远挂脖或戴着，哪怕没放歌，是「造型的一部分」', score: 8 },
        { key: 'B', text: '通勤才戴，但一定是降噪旗舰款且要露出来', score: 4 },
        { key: 'C', text: '有需要才拿出来，用完就收', score: 1 },
        { key: 'D', text: '用手机外放（另一种嘉豪，但不是本测试的嘉豪）', score: 2 },
      ],
    },
    {
      id: 9,
      tag: '网名/头像',
      title: '你的社交账号头像是——',
      options: [
        { key: 'A', text: '高对比度黑白剪影 / 背影 / 打码脸，网名带生僻字或英文缩写', score: 4 },
        { key: 'B', text: '自己的正脸照但开了重滤镜', score: 2 },
        { key: 'C', text: '宠物 / 风景 / 表情包', score: 0 },
        { key: 'D', text: '默认头像，从没换过', score: 1 },
      ],
    },
    {
      id: 10,
      tag: '说话 · 口头禅',
      title: '你有没有一个自己觉得很酷的口头禅？',
      options: [
        { key: 'A', text: '有，而且是句英文或谁也听不太懂的短语', score: 4 },
        { key: 'B', text: '有，中文的，但用得挺频繁', score: 2 },
        { key: 'C', text: '没有，想说啥说啥', score: 0 },
        { key: 'D', text: '有，是句梗，纯搞笑用', score: 1 },
      ],
    },
    {
      id: 11,
      tag: '音乐品味',
      title: '别人问你听什么歌，你会——',
      options: [
        { key: 'A', text: '报一串没人听过的小众厂牌/地下音乐人，末了加「你可能没听过」', score: 4 },
        { key: 'B', text: '说一个略冷门但能聊的，观察对方反应', score: 2 },
        { key: 'C', text: '直接说榜单热歌，好听就行', score: 0 },
        { key: 'D', text: '「我音乐品味很杂」然后不展开', score: 1 },
      ],
    },
    {
      id: 12,
      tag: '健身/运动',
      title: '你去操场/健身房，会——',
      options: [
        { key: 'A', text: '独自在角落做一套很有仪式感的动作，全程不看别人但希望别人看你', score: 4 },
        { key: 'B', text: '正常锻炼，但会挑人多的时段去', score: 2 },
        { key: 'C', text: '就是去出汗的，练完就走', score: 0 },
        { key: 'D', text: '办了卡没去过', score: 1 },
      ],
    },
    {
      id: 13,
      tag: '评论区',
      title: '刷到一条热门内容，你在评论区——',
      options: [
        { key: 'A', text: '发一条「与众不同」的高冷点评，暗示自己看得更透', score: 4 },
        { key: 'B', text: '跟风玩梗，但要玩得比别人早一点', score: 2 },
        { key: 'C', text: '就一个「哈哈哈」或点赞', score: 0 },
        { key: 'D', text: '只看不评', score: 0 },
      ],
    },
    {
      id: 14,
      tag: '实力检验 · 有活 vs 没活',
      title: '你之所以做上面那些「装」的事，是因为——',
      options: [
        { key: 'A', text: '我确实这方面很强，只是顺便展示一下', score: -4 },
        { key: 'B', text: '一半一半，有点本事也有点想被看见', score: 0 },
        { key: 'C', text: '说实话主要是想被看见，本事嘛……在练了', score: 4 },
        { key: 'D', text: '我没装啊？我一直这样，很自然', score: 4 },
      ],
    },
    {
      id: 15,
      tag: '元认知 · 自在极意豪悖论',
      title: '读完前面 14 题，你现在的感受是——',
      options: [
        { key: 'A', text: '「笑死，我朋友某某就是这样」（凝视他人型）', score: 4 },
        { key: 'B', text: '「有几题说的好像是我……」（有自觉）', score: -2 },
        { key: 'C', text: '「我要改一改」（强烈自觉）', score: -4 },
        { key: 'D', text: '「这测试本身就挺嘉豪的」（元嘲讽）', score: 2 },
      ],
    },
  ];

  /** 理论最高分（每题最高分之和），用于归一到 0–100 */
  const MAX_RAW = 104;

  const TIERS = [
    {
      id: 'T1',
      min: 0,
      max: 20,
      name: '正常人类·清醒得可怕',
      comment:
        '你清醒得让人心疼。测了半天愣是装不起来，恭喜你保住了做人的体面，也错过了青春期最珍贵的中二。别人虚空打碟的时候，你在虚空刷题。',
      quote: '你不是没资格嘉豪，你是懒得。',
      accent: 'blue',
    },
    {
      id: 'T2',
      min: 21,
      max: 45,
      name: '微量嘉豪·人畜无害',
      comment:
        '偶尔打打空气拳的程度。你身上有嘉豪的种子，但没浇水。这个浓度刚好——够让朋友笑话你，不够让你社死。守住它，别升级。',
      quote: '嘉豪苗子，尚可挽救。',
      accent: 'blue',
    },
    {
      id: 'T3',
      min: 46,
      max: 70,
      name: '标准嘉豪·隔壁班那个',
      comment:
        '实力不多但很会，你就是那个「隔壁班嘉豪」。别人一提就懂是谁。好消息是你有活的成分在涨；坏消息是装的成分涨得更快。按当前节奏，明年上重度档。',
      quote: '没活+为了装，公式给的很准。',
      accent: 'pink',
    },
    {
      id: 'T4',
      min: 71,
      max: 90,
      name: '重度嘉豪·按秒赔钱',
      comment:
        '虚空打碟本豪。你的每一个动作都在为氛围服务，投入与回报严重失衡——业内称「按秒赔钱」。你可能已经隐约察觉自己在装，这份自觉反而救不了你，只会让下一次更用力。',
      quote: '一套丝滑连招，进场马上被带走。',
      accent: 'pink',
    },
    {
      id: 'T5',
      min: 91,
      max: 100,
      name: '自在极意·豪',
      comment:
        '已臻化境。你压根没意识到自己在嘉豪，还乐在其中——而这，恰恰是唯一真正的嘉豪。悖论在于：一旦你读懂这段话开始收敛，你就跌出这一档了。所以最好的做法是，看完立刻忘掉，继续做你自己。B 哥见了都沉默。',
      quote: '没有人永远嘉豪，但你确实正在永远。',
      accent: 'ink',
    },
  ];

  const DISCLAIMER =
    '本测试为玩梗自嘲，非攻击。所谓嘉豪，不过是想展示自己、却把真心藏在了符号后面。没有人永远嘉豪，但永远有人怀念曾经嘉豪的自己。';

  const HAODAO_LINES = [
    '——被你说中了吧？（本梗招牌反问，必须 4:3、必须 fov120）',
    '——豪到你了？必须 1280×960，必须 fov120。',
    '——装？不，这叫参数美学。',
  ];

  root.HaoyiData = {
    QUESTIONS,
    MAX_RAW,
    TIERS,
    DISCLAIMER,
    HAODAO_LINES,
  };
})(typeof self !== 'undefined' ? self : this);
