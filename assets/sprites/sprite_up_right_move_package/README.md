# sprite_up_right_move_package

路径：`assets/sprites/sprite_up_right_move_package/`

内容：
- original/       原始切出的透明 PNG
- combo_frames/   每个角色 16 帧透明 PNG（前8帧向上，后8帧向右）
- combo_sheets/   每个角色一张横向 16 帧 spritesheet
- combo_gif/      每个角色一个 GIF 预览
- manifest.json   游戏读取配置
- preview/        总预览图

动作说明：
- 总动作：上走1格(8帧) → 右走1格(8帧)
- 合计16帧
- 人物造型不变，仅位移+走路缓动

默认参数：16帧、12fps、每段位移28px、透明背景。
