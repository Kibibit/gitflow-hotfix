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
const core_1 = require("@actions/core");
const github_1 = require("@actions/github");
const github_communicator_1 = require("./github-communicator");
run();
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        let githubCommunicator;
        try {
            const githubToken = (0, core_1.getInput)('token');
            const reviewerToken = (0, core_1.getInput)('reviewerToken');
            const hotfixAgainstBranch = (0, core_1.getInput)('hotfixAgainstBranch');
            const openPrAgainstBranch = (0, core_1.getInput)('openPrAgainstBranch');
            const jobName = (0, core_1.getInput)('jobName');
            const labelsInputString = (0, core_1.getInput)('labels') || '';
            const sharedLabelsInputString = (0, core_1.getInput)('sharedLabels') || '';
            const checkBranchPrefix = (0, core_1.getInput)('checkBranchPrefix') || 'hotfix/';
            const labels = (labelsInputString ?
                labelsInputString.split(',') :
                ['auto-created']).map((label) => label.trim());
            const sharedLabels = (sharedLabelsInputString ?
                sharedLabelsInputString.split(',') :
                ['hotfix']).map((label) => label.trim());
            const titlePrefix = (0, core_1.getInput)('titlePrefix') || '[AUTO]';
            githubCommunicator = new github_communicator_1.GithubCommunicator({
                githubToken,
                reviewerToken,
                hotfixAgainstBranch,
                openPrAgainstBranch,
                jobName,
                titlePrefix,
                labels,
                sharedLabels,
                checkBranchPrefix,
                context: github_1.context
            });
            yield githubCommunicator.openPRIfHotfix();
        }
        catch (error) {
            // should have reported on status already
            if (error instanceof Error)
                (0, core_1.setFailed)(error.message);
        }
    });
}
