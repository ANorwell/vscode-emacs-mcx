import { logger } from "./logger";
import { MessageManager } from "./message";

interface PrefixArgumentHandlerState {
  isInPrefixArgumentMode: boolean;
  isAcceptingPrefixArgument: boolean;
  cuCount: number; // How many C-u are input continuously
  prefixArgumentStr: string; // Prefix argument string input after C-u
}

export class PrefixArgumentHandler {
  private state: PrefixArgumentHandlerState;

  public constructor() {
    this.state = {
      isInPrefixArgumentMode: false,
      isAcceptingPrefixArgument: false,
      cuCount: 0,
      prefixArgumentStr: "",
    };
  }

  private updateState(newState: Partial<PrefixArgumentHandlerState>): void {
    const oldState = this.state;
    this.state = {
      ...this.state,
      ...newState,
    };
    if (oldState.isAcceptingPrefixArgument !== this.state.isAcceptingPrefixArgument) {
      logger.debug(
        `[PrefixArgumentHandler]\t isAcceptingPrefixArgument changed: ${this.state.isAcceptingPrefixArgument}.`
      );
    }
    if (
      oldState.isInPrefixArgumentMode !== this.state.isInPrefixArgumentMode ||
      oldState.prefixArgumentStr !== this.state.prefixArgumentStr ||
      oldState.cuCount !== this.state.cuCount
    ) {
      logger.debug(`[PrefixArgumentHandler]\t prefix argument changed: ${this.getPrefixArgument()}.`);
    }
  }

  public handleType(text: string): boolean {
    if (!this.state.isInPrefixArgumentMode) {
      logger.debug(`[PrefixArgumentHandler.handleType]\t Not in prefix argument mode. exit.`);
      return false;
    }

    if (this.state.isAcceptingPrefixArgument && !isNaN(+text)) {
      // If `text` is a numeric charactor
      this.updateState({
        prefixArgumentStr: this.state.prefixArgumentStr + text,
      });
      MessageManager.showMessage(`C-u ${this.state.prefixArgumentStr}-`);

      logger.debug(`[PrefixArgumentHandler.handleType]\t Prefix argument is "${this.state.prefixArgumentStr}"`);
      return true;
    }

    logger.debug(`[PrefixArgumentHandler.handleType]\t Prefix argument input is not accepted.`);
    return false;
  }

  /**
   * Emacs' ctrl-u
   */
  public universalArgument() {
    if (this.state.isInPrefixArgumentMode && this.state.prefixArgumentStr.length > 0) {
      logger.debug(`[PrefixArgumentHandler.universalArgument]\t Stop accepting prefix argument.`);
      this.updateState({
        isAcceptingPrefixArgument: false,
      });
    } else {
      logger.debug(`[PrefixArgumentHandler.universalArgument]\t Start prefix argument or count up C-u.`);
      this.updateState({
        isInPrefixArgumentMode: true,
        isAcceptingPrefixArgument: true,
        cuCount: this.state.cuCount + 1,
        prefixArgumentStr: "",
      });
    }
  }

  public cancel() {
    logger.debug(`[PrefixArgumentHandler.cancel]`);
    this.updateState({
      isInPrefixArgumentMode: false,
      isAcceptingPrefixArgument: false,
      cuCount: 0,
      prefixArgumentStr: "",
    });
  }

  public getPrefixArgument(): number | undefined {
    if (!this.state.isInPrefixArgumentMode) {
      return undefined;
    }

    const prefixArgument = parseInt(this.state.prefixArgumentStr, 10);
    if (isNaN(prefixArgument)) {
      return 4 ** this.state.cuCount;
    }
    return prefixArgument;
  }

  /**
   * This can be used to detect keyboard inputs starting with C-u.
   * Since C-u is assigned to universal-argument,
   * all multi-key keybindings starting with C-u can't be detected by VSCode
   * and have to be handled by this extension in its own way.
   */
  public precedingSingleCtrlU(): boolean {
    return this.state.isInPrefixArgumentMode && this.state.cuCount === 1;
  }
}
