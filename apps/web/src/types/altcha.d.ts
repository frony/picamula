declare module 'altcha' {
  export function createChallenge(options: {
    hmacKey: string;
    maxNumber?: number;
    saltLength?: number;
    algorithm?: string;
    expires?: Date;
  }): Promise<{
    algorithm: string;
    challenge: string;
    maxnumber: number;
    salt: string;
    signature: string;
  }>;

  export function verifySolution(
    payload: string,
    hmacKey: string,
    checkExpires?: boolean
  ): Promise<boolean>;
}

// Declare ALTCHA web component
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'altcha-widget': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          challengeurl?: string;
          hidefooter?: boolean;
          hidelogo?: boolean;
          ref?: React.Ref<any>;
        },
        HTMLElement
      >;
    }
  }
}

export {};
