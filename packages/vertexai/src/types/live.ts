import { Part } from "./content";

// sent in the first client message after establishing connection.
export interface LiveClientSetup {
  setup: {
    model: string;
    generation_config?: LiveGenerationConfig
  }
}

export interface LiveGenerationConfig {
  response_modalities?: ResponseModalities[];
  speech_config?: {
    voice_config?: {
      prebuilt_voice_config?: {
        voice_name?: string;
      }
    }
  }
}

export enum ResponseModalities {
  TEXT = 'TEXT',
  AUDIO = 'AUDIO',
  IMAGE = 'IMAGE"'
}

// response from the server after setup.
export interface LiveServerContent {
  serverContent: {
    // Defined if turn not complete
    modelTurn?: {
      parts: Part[]
    };
    // Defined if turn complete
    turnComplete?: boolean
  };
}

// user input sent in real time.
export interface LiveClientRealtimeInput {
  realtime_input: {
    media_chunks: {
      mime_type: string;
      data: string, // base64
      // will_continue: boolean
    }[];
  }
}

export interface LiveClientContent {
  client_content: {
    turns: {
      role: string;
      parts: Part[];
    }[];
    turn_complete: boolean;
  }
}