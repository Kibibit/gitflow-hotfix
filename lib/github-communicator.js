"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GithubCommunicator = exports.StatusMessage = void 0;
const core_1 = require("@actions/core");
const github_1 = require("@actions/github");
var StatusMessage;
(function (StatusMessage) {
    StatusMessage["PENDING"] = "Checking if hotfix branch";
    StatusMessage["NOT_HOTFIX"] = "Not a hotfix";
    StatusMessage["CREATING_PR"] = "Creating PR";
    StatusMessage["PR_CREATED"] = "PR created";
    StatusMessage["ALREADY_EXISTS"] = "PR already exists";
    StatusMessage["ERROR"] = "Something went wrong";
    StatusMessage["WAIT_FOR_PR_CHECKS"] = "Waiting for PR status checks to complete";
    StatusMessage["PR_CHECKS_COMPLETED"] = "All PR checks are completed";
})(StatusMessage = exports.StatusMessage || (exports.StatusMessage = {}));
class GithubCommunicator {
    constructor(options) {
        this.statusCheckName = 'gitflow-hotfix';
        this.options = options;
        this.context = options.context;
        this.octokit = (0, github_1.getOctokit)(this.options.githubToken);
        if (this.options.reviewerToken) {
            this.octokitReviewer = (0, github_1.getOctokit)(this.options.reviewerToken);
        }
    }
    openPRIfHotfix() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pullRequest = this.context.payload.pull_request;
            if (!pullRequest) {
                throw new Error(`No pull request found in context`);
            }
            try {
                const workflowName = process.env.GITHUB_WORKFLOW;
                (0, core_1.debug)(`workflowName: ${workflowName}`);
                if (!pullRequest) {
                    (0, core_1.debug)('No pull request found');
                    return;
                }
                yield this.setStatus({
                    label: this.statusCheckName,
                    currentStatus: StatusMessage.PENDING,
                    state: 'pending'
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                }, pullRequest);
                const baseBranch = pullRequest.base.ref;
                const branch = pullRequest.head.ref;
                const isHotfix = branch.startsWith(this.options.checkBranchPrefix);
                if (!isHotfix || baseBranch !== this.options.hotfixAgainstBranch) {
                    (0, core_1.info)(`Not a hotfix against ${this.options.hotfixAgainstBranch}. skipping...`);
                    yield this.setStatus({
                        label: this.statusCheckName,
                        currentStatus: StatusMessage.NOT_HOTFIX,
                        state: 'success'
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    }, pullRequest);
                    return;
                }
                const isPrAlreadyExistsCall = yield this.octokit.rest.pulls.list({
                    owner: this.context.repo.owner,
                    repo: this.context.repo.repo,
                    state: 'closed',
                    head: `${this.context.repo.owner}:${branch}`
                });
                const isPrAlreadyExists = isPrAlreadyExistsCall.data;
                // if only 1 exists, it will always be the one
                // at the first place in the array
                const existingPR = isPrAlreadyExists[0];
                // if (isPrAlreadyExists.length === 1) {
                (0, core_1.info)(`ONE open PR exists for ${branch}. Creating the second one against ${this.options.openPrAgainstBranch}`);
                yield this.setStatus({
                    label: this.statusCheckName,
                    currentStatus: StatusMessage.CREATING_PR,
                    state: 'pending'
                }, pullRequest);
                const prFooter = [
                    'This HOTFIX PR was created automatically from ',
                    `[PR #${existingPR.number}](${existingPR.html_url}) `,
                    `by [gitflow-hotfix](https://github.com/marketplace/actions/kibibit-gitflow-hotfix)`
                ].join('');
                const prBody = this.addPRBodyFooter(existingPR.body, prFooter);
                const createdPRCall = yield this.octokit.rest.pulls.create({
                    owner: this.context.repo.owner,
                    repo: this.context.repo.repo,
                    head: branch,
                    base: this.options.openPrAgainstBranch,
                    title: `${this.options.titlePrefix} ${existingPR.title}`,
                    body: prBody
                });
                const createdPR = createdPRCall.data;
                yield this.octokit.rest.issues.addAssignees({
                    owner: this.context.repo.owner,
                    repo: this.context.repo.repo,
                    issue_number: createdPR.number,
                    assignees: ((_a = existingPR.user) === null || _a === void 0 ? void 0 : _a.login) ? [existingPR.user.login] : []
                });
                if (this.options.reviewerToken && this.octokitReviewer) {
                    yield this.octokitReviewer.rest.pulls.createReview({
                        owner: this.context.repo.owner,
                        repo: this.context.repo.repo,
                        pull_number: createdPR.number,
                        event: 'APPROVE',
                        body: 'Auto approved by [gitflow-hotfix](https://github.com/marketplace/actions/kibibit-gitflow-hotfix)'
                    });
                }
                yield this.octokit.rest.issues.addLabels({
                    owner: this.context.repo.owner,
                    issue_number: createdPR.number,
                    repo: this.context.repo.repo,
                    labels: [...this.options.sharedLabels, ...this.options.labels]
                });
                yield this.octokit.rest.issues.addLabels({
                    owner: this.context.repo.owner,
                    issue_number: existingPR.number,
                    repo: this.context.repo.repo,
                    labels: [...this.options.sharedLabels]
                });
                (0, core_1.info)(`${createdPR.head.ref} was created`);
                yield this.setStatus({
                    label: this.statusCheckName,
                    currentStatus: StatusMessage.PR_CREATED,
                    state: 'success'
                }, pullRequest);
                (0, core_1.info)('Waiting for PR checks to complete before merging');
                yield this.setStatus({
                    label: this.statusCheckName,
                    currentStatus: StatusMessage.WAIT_FOR_PR_CHECKS,
                    state: 'pending'
                }, pullRequest);
                let prChecks;
                let prChecksCompleted;
                while (true) {
                    // eslint-disable-next-line no-await-in-loop
                    prChecks = yield this.getPRChecks(pullRequest.head.sha);
                    prChecksCompleted = prChecks.data
                        .check_runs.every((prCheck) => prCheck.status === 'completed' || (prCheck.name === this.options.jobName && prCheck.status === 'in_progress'));
                    if (prChecksCompleted) {
                        break;
                    }
                    // eslint-disable-next-line no-await-in-loop
                    yield this.wait(60 * 1000);
                }
                (0, core_1.info)('All PR checks are completed');
                yield this.setStatus({
                    label: this.statusCheckName,
                    currentStatus: StatusMessage.PR_CHECKS_COMPLETED,
                    state: 'success'
                }, pullRequest);
                (0, core_1.info)(`Merging PR number: ${createdPR.number}`);
                yield this.mergePR(createdPR.number);
                // } else {
                //   info('More than 1 PR already exists. doing nothing...');
                //   await this.setStatus({
                //     label: this.statusCheckName,
                //     currentStatus: StatusMessage.ALREADY_EXISTS,
                //     state: 'success'
                //   }, pullRequest);
                // }
            }
            catch (error) {
                yield this.setStatus({
                    label: this.statusCheckName,
                    currentStatus: StatusMessage.ERROR,
                    state: 'error'
                }, pullRequest);
                throw error;
            }
        });
    }
    getPRChecks(ref) {
        return __awaiter(this, void 0, void 0, function* () {
            // ref can be a SHA, branch name, or a tag name.
            try {
                const prChecks = yield this.octokit.rest.checks.listForRef({
                    owner: this.context.repo.owner,
                    repo: this.context.repo.repo,
                    ref: ref
                });
                return prChecks;
            }
            catch (error) {
                const errorMessage = (error instanceof Error ? error.message : error);
                throw new Error(`error while getting PR checks: ${errorMessage}`);
            }
        });
    }
    mergePR(pullNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.octokit.rest.pulls.merge({
                    owner: this.context.repo.owner,
                    repo: this.context.repo.repo,
                    pull_number: pullNumber
                });
                (0, core_1.info)(`Merged PR number: ${pullNumber}`);
            }
            catch (error) {
                const errorMessage = (error instanceof Error ? error.message : error);
                throw new Error(`error while merging PR: ${errorMessage}`);
            }
        });
    }
    addPRBodyFooter(body, footer) {
        let prBody = body || '';
        prBody += '\n\n-----\n';
        prBody += footer;
        return prBody;
    }
    setStatus(params, pr) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.octokit.rest.repos.createCommitStatus({
                    context: params.label,
                    description: params.currentStatus,
                    owner: this.context.repo.owner,
                    repo: this.context.repo.repo,
                    sha: pr.head.sha,
                    state: params.state,
                    target_url: ''
                });
                (0, core_1.info)(`Updated build status: ${params.currentStatus}`);
            }
            catch (error) {
                const errorMessage = (error instanceof Error ? error.message : error);
                throw new Error(`error while setting context status: ${errorMessage}`);
            }
        });
    }
    wait(ms) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield new Promise((resolve) => {
                setTimeout(() => resolve(true), ms);
            });
        });
    }
}
exports.GithubCommunicator = GithubCommunicator;
