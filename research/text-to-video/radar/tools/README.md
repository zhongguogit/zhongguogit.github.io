# tools/t2v.py

本地文生视频工作流助手。**不调用任何付费 API**，只做提示词构建、成本估算、模型推荐与额度校验。

## 命令

### 构建提示词

```bash
python3 tools/t2v.py prompt \
  --subject "橘猫蹲在雨后的青石巷口" \
  --action "缓慢抬头望向屋檐滴水" \
  --camera 推近 --shot 近景 --light 侧逆光 \
  --style "写实电影质感，35mm 胶片" \
  --duration 5 --aspect 16:9 --model wan
```

可选 `--lang en` 输出英文结构；`--model` 支持 `wan`、`hunyuan`、`ltx`、`mochi`、`cogvideo`、`runway`、`veo`、`kling`、`seedance`、`generic`。

### 估算成本

```bash
python3 tools/t2v.py cost --model wan-3 --resolution 720 --duration 5 --count 3
```

会输出单价、总价、人民币折算、Runway credits 与免费额度可生成条数。

### 推荐模型

```bash
python3 tools/t2v.py recommend --vram 16 --duration 10 --audio no
python3 tools/t2v.py recommend --duration 5 --audio yes --open-only
```

### 校验额度

```bash
python3 tools/t2v.py quota            # 查看
python3 tools/t2v.py quota --enforce  # 超限时以非零状态退出，可放在生成脚本前
```

规则：每天最多 3 次；剩余 credits 不足 60（一条 5 秒 Gen-4.5）时禁止生成。

## 数据来源

- `data/models.json`：模型、价格、来源。
- `generated/quota-log.csv`：额度日志。

修改模型或价格时只需改 `data/models.json`，CLI 与站点会同步生效。
