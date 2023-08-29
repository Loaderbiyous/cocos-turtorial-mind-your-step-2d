import { _decorator, CCInteger, Component, instantiate, Label, Node, Prefab, Vec3 } from 'cc';
import { PlayerController } from './PlayerController';
const { ccclass, property } = _decorator;

// 游戏状态：初始化、游戏中、结束
enum GameState {
    GS_INIT,
    GS_PLAYING,
    GS_END,
};
// 地图块的类型：空洞、石头
enum BlockType {
    BT_NONE,
    BT_STONE,
};

// 一个block的边长
const BLOCK_SIZE: number = 40;

@ccclass('GameManager')
export class GameManager extends Component {
    // 游戏地图画布
    @property({ type: Node })
    public playCanvas: Node | null = null;
    // 地图块所用的预制件
    @property({ type: Prefab })
    public boxPrefab: Prefab | null = null;
    // 地图块的总数量，决定了关卡的长度
    @property({ type: CCInteger })
    public roadLength: number = 20;
    // 用于存放地图信息的数组
    private _road: BlockType[] = [];
    // 开始的 UI
    @property({ type: Node })
    public startMenu: Node | null = null;
    // 输了的 UI
    @property({ type: Node })
    public loseMenu: Node | null = null;
    // 赢了的 UI
    @property({ type: Node })
    public winMenu: Node | null = null;
    // 角色控制器
    @property({ type: PlayerController })
    public playerCtrl: PlayerController | null = null;
    // 计步器
    @property({ type: Label })
    public stepsLabel: Label | null = null;
    // 计时器
    @property({ type: Label })
    public timerLabel: Label | null = null;
    // 当前跳跃的总步数
    private _curMoveIndex: number;
    // 游戏总时间
    private totalTime;
    // 游戏开始时间
    private startTime;
    // 游戏当前已进行时间
    private currentTime;
    // 最短用时
    private minimumTime = null;
    // 成绩标签
    @property({ type: Label })
    public gradeLabel: Label | null = null;
    // 最短用时标签
    @property({ type: Label })
    public minTimeLabel: Label | null = null;

    start() {
        this.setCurGameState(GameState.GS_INIT); // 第一初始化要在 start 里面调用
        this.playerCtrl?.node.on('JumpEnd', this.onPlayerJumpEnd, this);
    }

    update(deltaTime: number) {

    }

    generateRoad() {
        this.node.removeAllChildren();
        this._road = [];
        // 将_road[0]恒置为1，且不参与道路的创建。
        this._road.push(BlockType.BT_STONE);
        // 将_road[1]恒置为1，代表第一个地图块永远为石头
        this._road.push(BlockType.BT_STONE);
        // 生成剩余的地图块，循环共roadlength-1次
        for (let i = 2; i < this.roadLength + 1; i++) {
            // 保证最多连续两块地图块为空洞
            if (this._road[i - 2] === BlockType.BT_NONE && this._road[i - 1] === BlockType.BT_NONE) {
                this._road.push(BlockType.BT_STONE);
            } else {
                this._road.push(Math.floor(Math.random() * 2));
            }
        }
        // 将最后一块恒置为1，代表最后的终点位置地图块永远为石头
        this._road[this.roadLength] = BlockType.BT_STONE;

        // 实际生成关卡的地图
        for (let j = 1; j < this._road.length; j++) {
            let block: Node | null = this.spawnBlockByType(this._road[j]);
            if (block) {
                this.node.addChild(block);
                block.setPosition((j - 1) * BLOCK_SIZE, 0, 0);
            }
        }
    }

    spawnBlockByType(type: BlockType) {
        if (!this.boxPrefab) {
            return null;
        }
        let block: Node | null = null;
        switch (type) {
            case BlockType.BT_STONE:
                block = instantiate(this.boxPrefab);
                break;
        }
        return block;
    }

    // 设置游戏状态
    setCurGameState(value: GameState) {
        switch (value) {
            case GameState.GS_INIT:
                this.init();
                break;
            case GameState.GS_PLAYING:
                this.play();
                break;
            case GameState.GS_END:
                this.end();
                break;
        }
    }

    init() {
        if (this.startMenu && this.playCanvas) {
            // 隐藏游戏地图
            this.playCanvas.active = false;
            // 隐藏loseMenu
            this.loseMenu.active = false;
            // 隐藏winMenu
            this.winMenu.active = false;
            // 显示开始菜单
            this.startMenu.active = true;
        }
        // 生成关卡地图
        this.generateRoad();
        // 关闭玩家鼠标输入监听，并且初始化玩家的位置，并调用reset函数
        if (this.playerCtrl) {
            this.playerCtrl.setInputActive(false);
            this.playerCtrl.node.setPosition(Vec3.ZERO);
            this.playerCtrl.reset();
        }
        // 重置label的内容
        if (this.stepsLabel) {
            this.stepsLabel.string = 'step: 0';
        }
        // 显示最短用时
        if (!this.minimumTime) {
            // 还未产生过最短用时
            this.minTimeLabel.string = "No Record！";
        } else {
            this.minTimeLabel.string = "Minimum Time: " + this.minimumTime.toFixed(2) + " s";
        }
    }

    play() {
        if (this.startMenu && this.playCanvas) {
            // 关闭开始菜单
            this.startMenu.active = false;
            // 显示游戏地图
            this.playCanvas.active = true;
        }
        //直接设置active会直接开始监听鼠标事件，做了一下延迟处理
        setTimeout(() => {
            if (this.playerCtrl) {
                this.playerCtrl.setInputActive(true);
            }
        }, 0.1);

        // 初始化游戏总时间
        this.totalTime = 0;
        // 设置游戏开始时间
        this.startTime = Date.now();
        // 设置定时任务，在每一帧更新中更新实时时间
        this.schedule(this.updateTime, 0.007); // 每 0.1 秒更新一次
    }

    updateTime() {
        // 计算实时时间并更新 UI 元素
        this.currentTime = Date.now();
        let elapsedTime = (this.currentTime - this.startTime) / 1000; // 转换为秒
        this.timerLabel.string = "Time: " + elapsedTime.toFixed(2) + " s";
    }

    end() {
        // 取消定时任务
        this.unschedule(this.updateTime);
        // 确定游戏总时间
        this.totalTime = (this.currentTime - this.startTime) / 1000;
        if (this._curMoveIndex < this.roadLength - 1) {
            // 踩到空洞了，输了
            // 隐藏游戏地图
            this.playCanvas.active = false;
            // 显示loseMenu
            this.loseMenu.active = true;
        } else if (this._curMoveIndex == this.roadLength - 1) {
            // 到达终点，赢了
            // 隐藏游戏地图
            this.playCanvas.active = false;
            // 显示总时间
            this.gradeLabel.string = "Grade: " + this.totalTime.toFixed(2) + " s";
            // 产生了新的最短用时
            if (!this.minimumTime || this.totalTime < this.minimumTime) {
                this.minimumTime = this.totalTime;
            }
            // 显示winMenu
            this.winMenu.active = true;
        } else {
            // 跳过了终点，输了
            // 隐藏游戏地图
            this.playCanvas.active = false;
            // 显示loseMenu
            this.loseMenu.active = true;
        }
    }

    // 监听按钮被按下的动作
    onStartButtonClicked() {
        this.setCurGameState(GameState.GS_PLAYING);
    }
    onRetryButtonClicked() {
        this.setCurGameState(GameState.GS_INIT);
        this.setCurGameState(GameState.GS_PLAYING);
    }
    onReplayButtonClicked() {
        this.setCurGameState(GameState.GS_INIT);
        this.setCurGameState(GameState.GS_PLAYING);
    }
    onExitButtonClicked() {
        this.setCurGameState(GameState.GS_INIT);
    }

    // 当玩家落地时
    onPlayerJumpEnd(moveIndex: number) {
        // 先将步数保存
        this._curMoveIndex = moveIndex;
        // 设置label内容
        if (this.stepsLabel) {
            this.stepsLabel.string = 'step: ' + (moveIndex >= this.roadLength ? this.roadLength : moveIndex);
        }
        this.checkResult(moveIndex);
    }

    // 判定角色是否跳跃到坑或者跳完所有地块
    checkResult(moveIndex: number) {
        if (moveIndex < this.roadLength - 1) {
            if (this._road[moveIndex + 1] == BlockType.BT_NONE) {   //跳到了空方块上
                this.setCurGameState(GameState.GS_END); // 输了
            }
        } else if (moveIndex == this.roadLength - 1) {     //跳到了最后一个方块上（终点）
            this.setCurGameState(GameState.GS_END); // 赢了
        } else {    // 跳过了最大长度
            this.setCurGameState(GameState.GS_END); // 输了
        }
    }
}




