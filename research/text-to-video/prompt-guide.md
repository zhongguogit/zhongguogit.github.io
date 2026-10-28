# 文生视频提示词与工作流指南

> 更新：2026-10-28 · 适用于 Wan / HunyuanVideo / LTX / Kling / Runway / Veo / Seedance

## 一、六段式提示词公式

大多数文生视频模型对“结构化描述”最敏感。推荐顺序：

```text
主体 + 动作 + 场景 + 镜头运动 + 光线 + 风格/画质
```

| 段落 | 回答什么 | 示例 |
| --- | --- | --- |
| 主体 | 谁/什么，外观细节 | 一位银发潜水员，黄色潜水服 |
| 动作 | 正在发生什么，按时间顺序 | 缓慢推开舱门，气泡向上翻涌 |
| 场景 | 地点、天气、环境细节 | 深海沉船内部，锈蚀金属，悬浮微粒 |
| 镜头 | 景别 + 机位 + 运动 + 速度 | 中景，低角度，缓慢环绕，浅景深 |
| 光线 | 方向 + 质感 + 色温 + 对比 | 顶部冷蓝聚光，边缘轮廓光，高对比 |
| 风格 | 摄影/动画/胶片/渲染风格 | 电影摄影，35mm 胶片颗粒，青橙色调 |

**一条合格提示词的控制变量不要超过 6–8 个**；变量越多，模型越容易顾此失彼。

## 二、镜头词表（直接复制）

| 类型 | 可用词 |
| --- | --- |
| 景别 | extreme wide shot、wide shot、medium shot、medium close-up、close-up、macro shot |
| 机位 | eye-level、low angle、high angle、bird's-eye view、over-the-shoulder、Dutch angle |
| 运动 | static/locked-off、slow dolly in、dolly out、truck left/right、pan left/right、tilt up/down、crane up/down、orbit/arc shot、handheld follow、whip pan、zoom in/out |
| 速度 | slow、deliberate、steady、fast、sudden |
| 焦点 | shallow depth of field、deep focus、rack focus、soft bokeh |
| 质感 | 35mm film grain、anamorphic flare、shallow DOF、HDR、cinematic contrast |

> 经验：**一个镜头只写一个主动作 + 一个主动运镜**。同时写“环绕 + 推近 + 升降”通常会让模型产生漂移。

## 三、光线词表

| 维度 | 选项 |
| --- | --- |
| 方向 | front light、side light、backlight、rim light、top light、underlight、practical light |
| 质感 | hard light、soft light、diffused、dappled、volumetric |
| 色温 | warm tungsten、cool daylight、golden hour、blue hour、neon magenta/cyan |
| 对比 | high contrast、low key、high key、silhouette |
| 环境 | HDRI-mapped environment、overcast sky、haze、god rays、wet reflections |

至少写 **两个维度**（如“冷色顶光 + 高对比”），否则模型容易回到“无来源平光”。

## 四、负面提示词

不同平台支持程度不同；不支持时删掉即可，不要硬塞。

```text
blurry, low resolution, jpeg artifacts, oversaturated, flat lighting,
extra fingers, deformed hands, extra limbs, fused fingers, distorted face,
duplicate subject, text watermark, logo, subtitles, flicker, jitter,
morphing, warping, inconsistent identity, abrupt cut, camera shake
```

中文平台可用：

```text
模糊，低清晰度，噪点，过曝，平光，畸形手，多手指，多肢体，面部扭曲，
重复主体，水印，字幕，闪烁，抖动，形变，人物不一致，突然切镜
```

## 五、示例：从一句话到可生成提示词

**输入**

> 雨夜的东京便利店门口，一个穿透明雨衣的女孩在等车，镜头慢慢推近，霓虹反光。

**输出（英文，适合 Runway/Kling/Veo）**

```text
A young woman in a transparent raincoat stands at the entrance of a Tokyo convenience store on a rainy night, holding a folded umbrella and glancing down the empty street. Medium shot, eye-level, slow dolly in, shallow depth of field. Cool neon reflections in cyan and magenta ripple across the wet pavement, backlit by the store's fluorescent glow, high contrast, cinematic 35mm film grain, anamorphic lens flare. Rain streaks are visible in the light. The camera movement is smooth and deliberate; the subject remains centered. 5 seconds, 16:9.
```

**中文版（适合混元/万相/即梦）**

```text
雨夜东京便利店门口，一位穿透明雨衣的年轻女孩拿着折伞，低头望向空荡的街道。中景，平视，镜头缓慢推近，浅景深。青品红色霓虹倒影在湿漉漉的地面上流动，便利店冷白荧光从背后打来，高对比，电影感 35mm 胶片颗粒，变形宽银幕光晕。雨丝在灯光中可见。镜头运动平稳克制，主体保持画面中央。5 秒，16:9。
```

## 六、多镜头短片工作流（3 镜头）

每天最多 3 次生成时，建议按“建立镜头 → 细节镜头 → 收尾镜头”分配：

| 镜头 | 目的 | 提示词重点 | 时长 |
| --- | --- | --- | --- |
| Shot 1 | 交代环境/人物 | wide shot + 环境光 + 缓慢推进 | 5s |
| Shot 2 | 情绪/动作细节 | close-up + 浅景深 + 微动作 | 5s |
| Shot 3 | 收束/转场 | 拉远/升降 + 光线变化 | 5s |

保持三个镜头共享：**同一主体描述、同一色调、同一时间/天气**。只改变景别、机位和动作，才能剪在一起。

## 七、平台适配技巧

| 平台 | 提示词偏好 | 建议 |
| --- | --- | --- |
| Runway Gen-4.5 | 英文、镜头语言清晰 | 明确“one camera move”，避免堆叠运镜 |
| Kling 3.0/4.0 | 中英文均可、动作描述强 | 把动作拆成“起始→过程→结束” |
| Veo 3.1 | 自然语言、对白/音效 | 可直接写台词与环境声，支持原生音频 |
| Seedance 2.0 | 中文语义好、多镜头 | 一次只写一个镜头，后期拼接 |
| Wan 3.0 | 中文、结构化 | 用“主体+动作+场景+镜头+光线+风格”模板 |
| 混元 1.5 | 中文指令遵循强 | 可用“镜头从…移动到…”句式 |
| LTX-2.5 | 英文、音画同步 | 同时描述画面声音（雨声、脚步、对白） |

## 八、生成前质检清单

- [ ] 主体描述是否唯一？有没有“一个人”却出现多个人的风险？
- [ ] 动作是否单一、可按时间顺序理解？
- [ ] 是否只指定了一个主动运镜？
- [ ] 光线是否至少写了方向 + 色温/对比？
- [ ] 时长、画幅、分辨率是否符合目标平台？
- [ ] 负面提示词是否包含手部/面部/水印？
- [ ] 是否检查了当日额度和剩余 credits？
- [ ] 是否准备好命名：`YYYY-MM-DD_模型_时长_序号.mp4`？

## 九、本地部署速查

> 以下命令来自官方 README，执行前请以仓库最新文档为准。

### Wan2.2-TI2V-5B（24GB 显存）

```bash
git clone https://github.com/Wan-Video/Wan2.2.git
cd Wan2.2
pip install -r requirements.txt
huggingface-cli download Wan-AI/Wan2.2-TI2V-5B --local-dir ./Wan2.2-TI2V-5B

python generate.py \
  --task ti2v-5B \
  --size 1280*704 \
  --ckpt_dir ./Wan2.2-TI2V-5B \
  --offload_model True --convert_model_dtype --t5_cpu \
  --prompt "Your prompt here"
```

### HunyuanVideo 1.5（14GB 起）

```bash
git clone https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5.git
cd HunyuanVideo-1.5
pip install -r requirements.txt

torchrun --nproc_per_node=1 generate.py \
  --prompt "Your prompt here" \
  --resolution 720p \
  --aspect_ratio 16:9 \
  --model_path ./ckpts \
  --output_path ./outputs/output.mp4
```

> 显存不足时保持默认 `--offloading true`；720P 模型可启用 `--sparse_attn`（需 H 系列 GPU）。

### LTX-2.5（约 66GiB 权重，建议 24GB+）

```bash
hf auth login
hf download Lightricks/LTX-2.5 \
  diffusion_models/ltx-2.5-22b-distilled-transformer-bf16.safetensors \
  text_encoders/gemma4-12b-with-proj-ltx-2.5-bf16.safetensors \
  vae/ltx-2.5-video-vae-bf16.safetensors \
  vae/ltx-2.5-audio-vae-bf16.safetensors \
  latent_upscale_models/ltx-2.5-latent-spatial-upscaler-x2-bf16-1.0.safetensors \
  --local-dir models/ltx-2.5

uv run python -m ltx_pipelines.distilled \
  --transformer-path models/ltx-2.5/diffusion_models/ltx-2.5-22b-distilled-transformer-bf16.safetensors \
  --text-encoder-path models/ltx-2.5/text_encoders/gemma4-12b-with-proj-ltx-2.5-bf16.safetensors \
  --video-vae-path models/ltx-2.5/vae/ltx-2.5-video-vae-bf16.safetensors \
  --audio-vae-path models/ltx-2.5/vae/ltx-2.5-audio-vae-bf16.safetensors \
  --spatial-upsampler-path models/ltx-2.5/latent_upscale_models/ltx-2.5-latent-spatial-upscaler-x2-bf16-1.0.safetensors \
  --num-frames 121 --seed 42 \
  --output-path output.mp4 \
  --prompt "Your prompt here"
```

> 显存不足可加 `--quantization fp8-cast --offload cpu`（或 `disk`）。

## 十、参考

- Adobe Firefly：Writing effective text prompts for video generation
- Versely Studio：AI Video Prompt Engineering: Advanced Techniques for 2026
- Promptailearning：Text-to-Video Prompt Guide 2026
- Wan2.2 / HunyuanVideo 1.5 / LTX-2 官方 README
