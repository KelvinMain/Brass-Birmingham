import type { AiAgentFactory } from '../aiActions'
import { createStrategicAiAgent } from '../aiActions'
import { loadEvolvedModelFromUrl } from './neuralModel'
import { createNeuralAiAgentFactory } from './neuralAgent'
import type * as tf from '@tensorflow/tfjs'

const EVOLVED_MODEL_URL = '/ai/evolved-model.json'

let evolvedModel: tf.LayersModel | null = null
let loadPromise: Promise<tf.LayersModel | null> | null = null

export function loadEvolvedModel(url = EVOLVED_MODEL_URL): Promise<tf.LayersModel | null> {
  if (!loadPromise) {
    loadPromise = loadEvolvedModelFromUrl(url).then((model) => {
      evolvedModel = model
      return model
    })
  }

  return loadPromise
}

export function getEvolvedAiAgentFactory(): AiAgentFactory | null {
  if (!evolvedModel) {
    return null
  }

  return createNeuralAiAgentFactory(evolvedModel)
}

export async function initEvolvedAgent(url = EVOLVED_MODEL_URL): Promise<AiAgentFactory | null> {
  await loadEvolvedModel(url)

  return getEvolvedAiAgentFactory()
}

export function createVsAiAgentFactory(
  evolvedFactory: AiAgentFactory | null,
): AiAgentFactory {
  return (game, playerId, random) => {
    if (evolvedFactory) {
      return evolvedFactory(game, playerId, random)
    }

    return createStrategicAiAgent(game, playerId, random)
  }
}
