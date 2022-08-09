import { getInput, setFailed } from '@actions/core';
import { context } from '@actions/github';

import { GithubCommunicator } from './github-communicator';

run();

async function run(): Promise<void> {
  let githubCommunicator: GithubCommunicator;
  try {
    const githubToken = getInput('token');
    const reviewerToken = getInput('reviewerToken');
    const hotfixAgainstBranch = getInput('hotfixAgainstBranch');
    const openPrAgainstBranch = getInput('openPrAgainstBranch');
    const jobName = getInput('jobName');
    const labelsInputString = getInput('labels') || '';
    const sharedLabelsInputString = getInput('sharedLabels') || '';
    const checkBranchPrefix = getInput('checkBranchPrefix') || 'hotfix/';
    const labels = (
      labelsInputString ?
        labelsInputString.split(',') :
        [ 'auto-created' ]
    ).map((label) => label.trim());
    const sharedLabels = (
      sharedLabelsInputString ?
      sharedLabelsInputString.split(',') :
        [ 'hotfix' ]
    ).map((label) => label.trim());
    const titlePrefix = getInput('titlePrefix') || '[AUTO]';

    githubCommunicator = new GithubCommunicator({
      githubToken,
      reviewerToken,
      hotfixAgainstBranch,
      openPrAgainstBranch,
      jobName,
      titlePrefix,
      labels,
      sharedLabels,
      checkBranchPrefix,
      context
    });

    await githubCommunicator.openPRIfHotfix();
  } catch (error) {
    // should have reported on status already
    if (error instanceof Error) setFailed(error.message);
  }
}
