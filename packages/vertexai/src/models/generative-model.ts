/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  generateContent,
  generateContentStream
} from '../methods/generate-content';
import {
  Content,
  CountTokensRequest,
  CountTokensResponse,
  GenerateContentRequest,
  GenerateContentResult,
  GenerateContentStreamResult,
  GenerationConfig,
  ModelParams,
  Part,
  RequestOptions,
  SafetySetting,
  StartChatParams,
  Tool,
  ToolConfig
} from '../types';
import { ChatSession } from '../methods/chat-session';
import { countTokens } from '../methods/count-tokens';
import {
  formatGenerateContentInput,
  formatSystemInstruction
} from '../requests/request-helpers';
import { VertexAI } from '../public-types';
import { VertexAIModel } from './vertexai-model';
import { LiveClientContent, LiveClientRealtimeInput, LiveClientSetup, LiveGenerationConfig, LiveServerContent } from '../types/live';

/**
 * Class for generative model APIs.
 * @public
 */
export class GenerativeModel extends VertexAIModel {
  generationConfig: GenerationConfig;
  safetySettings: SafetySetting[];
  requestOptions?: RequestOptions;
  tools?: Tool[];
  toolConfig?: ToolConfig;
  systemInstruction?: Content;

  constructor(
    vertexAI: VertexAI,
    modelParams: ModelParams,
    requestOptions?: RequestOptions
  ) {
    super(vertexAI, modelParams.model);
    this.generationConfig = modelParams.generationConfig || {};
    this.safetySettings = modelParams.safetySettings || [];
    this.tools = modelParams.tools;
    this.toolConfig = modelParams.toolConfig;
    this.systemInstruction = formatSystemInstruction(
      modelParams.systemInstruction
    );
    this.requestOptions = requestOptions || {};
  }

  /**
   * Makes a single non-streaming call to the model
   * and returns an object containing a single <code>{@link GenerateContentResponse}</code>.
   */
  async generateContent(
    request: GenerateContentRequest | string | Array<string | Part>
  ): Promise<GenerateContentResult> {
    const formattedParams = formatGenerateContentInput(request);
    return generateContent(
      this._apiSettings,
      this.model,
      {
        generationConfig: this.generationConfig,
        safetySettings: this.safetySettings,
        tools: this.tools,
        toolConfig: this.toolConfig,
        systemInstruction: this.systemInstruction,
        ...formattedParams
      },
      this.requestOptions
    );
  }

  /**
   * Makes a single streaming call to the model
   * and returns an object containing an iterable stream that iterates
   * over all chunks in the streaming response as well as
   * a promise that returns the final aggregated response.
   */
  async generateContentStream(
    request: GenerateContentRequest | string | Array<string | Part>
  ): Promise<GenerateContentStreamResult> {
    const formattedParams = formatGenerateContentInput(request);
    return generateContentStream(
      this._apiSettings,
      this.model,
      {
        generationConfig: this.generationConfig,
        safetySettings: this.safetySettings,
        tools: this.tools,
        toolConfig: this.toolConfig,
        systemInstruction: this.systemInstruction,
        ...formattedParams
      },
      this.requestOptions
    );
  }

  /**
   * Gets a new <code>{@link ChatSession}</code> instance which can be used for
   * multi-turn chats.
   */
  startChat(startChatParams?: StartChatParams): ChatSession {
    return new ChatSession(
      this._apiSettings,
      this.model,
      {
        tools: this.tools,
        toolConfig: this.toolConfig,
        systemInstruction: this.systemInstruction,
        ...startChatParams
      },
      this.requestOptions
    );
  }

  async startLiveSession(config?: LiveGenerationConfig): Promise<LiveSession> {
    const _bidiGoogleAI = false;
    const _baseDailyUrl = 'daily-firebaseml.sandbox.googleapis.com';
    const _apiUrl =
        'ws/google.firebase.machinelearning.v2beta.LlmBidiService/BidiGenerateContent?key=';
    const _baseGAIUrl = 'generativelanguage.googleapis.com';
    const _apiGAIUrl = 'ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=';
    const model = 'gemini-2.0-flash-exp'

    let url;
    let modelString = '';
    if (_bidiGoogleAI) {
      const gaiApiKey = '';
      url = `wss://${_baseGAIUrl}/${_apiGAIUrl}${gaiApiKey}`;
      modelString = `models/${model}`;
    } else {
      url = `wss://${_baseDailyUrl}/${_apiUrl}${this._apiSettings.apiKey}`;
      modelString =
          `projects/${this._apiSettings.project}/locations/${this._apiSettings.location}/publishers/google/models/${model}`;
    }

    const socket = new WebSocket(url)

    socket.onopen = () => {
      const liveClientSetup: LiveClientSetup = {
        setup: {
          model: modelString,
          generation_config: config
        }
      }
      socket.send(JSON.stringify(liveClientSetup));
    }

    const setupComplete = new Promise((resolve, reject) => {
      socket.onmessage = async (event) => {
        console.log('received message in `startLiveSession`')
        const msg = JSON.parse(await (event.data as Blob).text());
        if (msg.setupComplete) {
          resolve('setup complete.');
        } else {
          reject('first message did not contain `setup_complete`');
        }
      };
    });

    await setupComplete;
    return new LiveSession(socket);
  }

  /**
   * Counts the tokens in the provided request.
   */
  async countTokens(
    request: CountTokensRequest | string | Array<string | Part>
  ): Promise<CountTokensResponse> {
    const formattedParams = formatGenerateContentInput(request);
    return countTokens(this._apiSettings, this.model, formattedParams);
  }
}

export class LiveSession {
  constructor(private socket: WebSocket) { 
    console.log('started new LiveSession');
    this.socket.onclose = (event) => {
      console.log('websocket closed', event);
    }

    this.socket.onerror = (event) => {
      console.log('websocket error:', event)
    }
  }

  sendText(data: string, turnComplete: boolean) {
    if(!this.socket.OPEN) {
      throw new Error("Cannot send message. Live connection was closed.")
    }
    const msg: LiveClientContent = {
      client_content: {
        turns: [{
          role: 'user',
          parts: [{
            text: data
          }]
        }],
        turn_complete: turnComplete
      },
    }
    this.socket.send(JSON.stringify(msg));
  }

  sendAudio(data: string, turnComplete: boolean) {
    if(!this.socket.OPEN) {
      throw new Error("Cannot send message. Live connection was closed.")
    }
    const msg: LiveClientContent = {
      client_content: {
        turns: [{
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'audio/pcm',
                data,
              }
            }
        ]
        }],
        turn_complete: turnComplete
      },
    }
    this.socket.send(JSON.stringify(msg));
  }

  sendRealtimeAudio(realtime_input: LiveClientRealtimeInput) {
    if (!this.socket.OPEN) {
      throw new Error("Cannot send message. Live Connection was closed");
    }

    this.socket.send(JSON.stringify(realtime_input));
  }

  // Assumes the setup_complete message was already received
  onMessage(callback: (content: LiveServerContent) => void) {
    console.log("setting onMessage callback");
    this.socket.onmessage = async (event) => {
      console.log("triggering onMessage callback");
      const content: LiveServerContent = JSON.parse(await (event.data as Blob).text())
      callback(content);
    }
  }

  close() {
    if (!this.socket.OPEN) { 
      throw new Error("Socket is not in a state that can be closed. Aborting close.")
    }

    console.log('closing web socket');
    this.socket.close();
  }
}
