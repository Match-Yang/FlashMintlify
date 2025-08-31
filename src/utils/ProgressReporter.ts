/**
 * FlashMintlify - Progress reporter utilities
 *
 * @author Match-Yang(OliverYeung)
 * @email oliver.yeung.me@gmail.com
 * @license MIT
 */
import * as vscode from 'vscode';

/**
 * Progress Reporter - Shows processing progress in the bottom right corner
 */
export class ProgressReporter {
    private progress?: vscode.Progress<{ message?: string; increment?: number }>;
    private currentProgress: number = 0;
    private totalSteps: number = 100;

    /**
     * Start showing progress
     */
    async start(title: string, totalSteps: number = 100): Promise<void> {
        this.totalSteps = totalSteps;
        this.currentProgress = 0;

        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: title,
            cancellable: false
        }, async (progress) => {
            this.progress = progress;
            return new Promise<void>((resolve) => {
                // Keep progress bar visible until manually ended
                this.onComplete = resolve;
            });
        });
    }

    private onComplete?: () => void;

    /**
     * Update progress
     */
    report(step: number, message: string): void {
        if (!this.progress) return;

        const increment = step - this.currentProgress;
        this.currentProgress = step;

        this.progress.report({
            increment: increment,
            message: message
        });
    }

    /**
     * Complete progress display
     */
    complete(): void {
        if (this.onComplete) {
            this.onComplete();
            this.onComplete = undefined;
        }
    }
}

/**
 * Update result statistics
 */
export interface UpdateResult {
    /** Number of internal links updated */
    linksUpdated: number;
    /** Number of import statements updated */
    importsUpdated: number;
    /** Number of navigation paths updated */
    navigationUpdated: number;
    /** List of updated files */
    updatedFiles: string[];
    /** Error messages */
    errors: string[];
}

/**
 * Create empty update result
 */
export function createEmptyResult(): UpdateResult {
    return {
        linksUpdated: 0,
        importsUpdated: 0,
        navigationUpdated: 0,
        updatedFiles: [],
        errors: []
    };
}

/**
 * Merge update results
 */
export function mergeResults(result1: UpdateResult, result2: UpdateResult): UpdateResult {
    return {
        linksUpdated: result1.linksUpdated + result2.linksUpdated,
        importsUpdated: result1.importsUpdated + result2.importsUpdated,
        navigationUpdated: result1.navigationUpdated + result2.navigationUpdated,
        updatedFiles: [...new Set([...result1.updatedFiles, ...result2.updatedFiles])],
        errors: [...result1.errors, ...result2.errors]
    };
}

/**
 * Show update result summary
 */
export function showResultSummary(result: UpdateResult): void {
    const { linksUpdated, importsUpdated, navigationUpdated, updatedFiles, errors } = result;
    
    let message = `Update completed!`;

    if (linksUpdated > 0 || importsUpdated > 0 || navigationUpdated > 0) {
        const details = [];
        if (linksUpdated > 0) details.push(`${linksUpdated} internal links`);
        if (importsUpdated > 0) details.push(`${importsUpdated} import statements`);
        if (navigationUpdated > 0) details.push(`${navigationUpdated} navigation paths`);

        message += ` Updated ${details.join(', ')}`;

        if (updatedFiles.length > 0) {
            message += `\n\nModified files:\n${updatedFiles.map(f => `• ${f}`).join('\n')}`;
        }
    } else {
        message += ` No references found to update.`;
    }

    if (errors.length > 0) {
        message += `\n\nErrors:\n${errors.join('\n')}`;
        vscode.window.showWarningMessage(message);
    } else {
        vscode.window.showInformationMessage(message);
    }
}
