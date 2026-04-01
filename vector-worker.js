// vector-worker.js
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

// 配置：优先使用镜像，如果有VPN会自动回退
env.allowLocalModels = false;
env.useBrowserCache = true;

let embedder = null;

// 初始化模型
async function init(modelName = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2') {
    if (embedder) return;
    self.postMessage({ type: 'status', msg: '正在初始化语义引擎...' });
    try {
        embedder = await pipeline('feature-extraction', modelName, {
            // 这里可以设置进度回调
            progress_callback: (p) => {
                if (p.status === 'progress') {
                    self.postMessage({ type: 'downloading', percent: p.progress.toFixed(1) });
                }
            }
        });
        self.postMessage({ type: 'status', msg: '引擎初始化完成' });
        self.postMessage({ type: 'ready' });
    } catch (e) {
        self.postMessage({ type: 'error', msg: '初始化失败: ' + e.message });
    }
}

// 计算余弦相似度
function cosineSimilarity(v1, v2) {
    let dot = 0; let n1 = 0; let n2 = 0;
    for (let i = 0; i < v1.length; i++) {
        dot += v1[i] * v2[i];
        n1 += v1[i] * v1[i];
        n2 += v2[i] * v2[i];
    }
    return dot / (Math.sqrt(n1) * Math.sqrt(n2));
}

self.onmessage = async (e) => {
    const { type, text, vectors, topN, id } = e.data;

    if (type === 'init') {
        await init();
    } else if (type === 'getVector') {
        // 将文本转向量
        if (!embedder) await init();
        const output = await embedder(text, { pooling: 'mean', normalize: true });
        self.postMessage({ type: 'vectorResult', vector: Array.from(output.data), id });
    } else if (type === 'search') {
        // 计算搜索结果
        const queryVector = await embedder(text, { pooling: 'mean', normalize: true });
        const queryArr = Array.from(queryVector.data);
        
        const results = vectors.map(item => ({
            id: item.id,
            relevance: cosineSimilarity(queryArr, item.vector)
        }))
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, topN);

        self.postMessage({ type: 'searchResult', results, searchId: id });
    }
};
