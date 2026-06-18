import * as tf from '@tensorflow/tfjs'

import {
  AI_PARAM_COUNT,
  AI_PARAM_NAMES,
  DEFAULT_PARAMS,
  paramsFromNetworkOutput,
  type AiScoringParams,
} from './params'
import { AI_STATE_FEATURE_COUNT } from './stateEncoding'

export type SerializedScoringNetwork = {
  stateFeatureCount: number
  paramCount: number
  weightData: number[][]
}

export function buildScoringNetwork(
  stateFeatureCount: number = AI_STATE_FEATURE_COUNT,
): tf.LayersModel {
  const model = tf.sequential()
  model.add(
    tf.layers.dense({
      units: 512,
      activation: 'relu',
      inputShape: [stateFeatureCount],
    }),
  )
  model.add(tf.layers.dense({ units: 256, activation: 'relu' }))
  model.add(tf.layers.dense({ units: AI_PARAM_COUNT }))
  model.compile({ optimizer: 'adam', loss: 'meanSquaredError' })

  return model
}

export function predictParams(model: tf.LayersModel, stateVector: Float32Array): AiScoringParams {
  return tf.tidy(() => {
    const input = tf.tensor2d([Array.from(stateVector)])
    const output = model.predict(input) as tf.Tensor
    const raw = output.dataSync()

    return paramsFromNetworkOutput(raw)
  })
}

export function getModelWeightVector(model: tf.LayersModel): Float32Array {
  const weights = model.getWeights()
  const totalSize = weights.reduce((sum, weight) => sum + weight.size, 0)
  const values = new Float32Array(totalSize)
  let offset = 0

  for (const weight of weights) {
    const data = weight.dataSync()
    values.set(data, offset)
    offset += data.length
  }

  return values
}

export function setModelWeightVector(model: tf.LayersModel, vector: Float32Array | number[]): void {
  const weights = model.getWeights()
  let offset = 0

  const nextWeights = weights.map((weight) => {
    const size = weight.size
    const slice = vector.slice(offset, offset + size)
    offset += size
    return tf.tensor(slice, weight.shape, weight.dtype)
  })

  model.setWeights(nextWeights)
}

export function cloneModel(model: tf.LayersModel): tf.LayersModel {
  const cloned = buildScoringNetwork(AI_STATE_FEATURE_COUNT)
  cloned.setWeights(model.getWeights().map((weight) => weight.clone()))

  return cloned
}

export async function warmStartToDefaultParams(
  model: tf.LayersModel,
  steps = 200,
): Promise<void> {
  const weights = model.getWeights()
  const target = Float32Array.from(AI_PARAM_NAMES.map((name) => DEFAULT_PARAMS[name]))

  if (weights.length >= 1) {
    const nextWeights = weights.map((weight, index) => {
      if (index === weights.length - 1) {
        return tf.tensor(target, weight.shape, weight.dtype)
      }

      return tf.zeros(weight.shape, weight.dtype)
    })
    model.setWeights(nextWeights)
    return
  }

  const input = tf.tensor2d([Array.from(new Float32Array(AI_STATE_FEATURE_COUNT))])
  const targetTensor = tf.tensor2d([Array.from(target)])

  for (let step = 0; step < steps; step += 1) {
    await model.fit(input, targetTensor, {
      epochs: 1,
      verbose: 0,
    })
  }

  input.dispose()
  targetTensor.dispose()
}

export function serializeModel(model: tf.LayersModel): SerializedScoringNetwork {
  return {
    stateFeatureCount: AI_STATE_FEATURE_COUNT,
    paramCount: AI_PARAM_COUNT,
    weightData: model.getWeights().map((weight) => Array.from(weight.dataSync())),
  }
}

export function deserializeModel(serialized: SerializedScoringNetwork): tf.LayersModel {
  const model = buildScoringNetwork(serialized.stateFeatureCount)
  const shapes = model.getWeights().map((weight) => weight.shape)
  const weights = serialized.weightData.map((data, index) =>
    tf.tensor(data, shapes[index], 'float32'),
  )
  model.setWeights(weights)

  return model
}

export async function loadEvolvedModelFromUrl(url: string): Promise<tf.LayersModel | null> {
  try {
    const response = await fetch(url)

    if (!response.ok) {
      return null
    }

    const serialized = (await response.json()) as SerializedScoringNetwork

    if (
      serialized.stateFeatureCount !== AI_STATE_FEATURE_COUNT ||
      serialized.paramCount !== AI_PARAM_COUNT
    ) {
      return null
    }

    return deserializeModel(serialized)
  } catch {
    return null
  }
}
