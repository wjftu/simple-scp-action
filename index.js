const core = require('@actions/core');
const { execSync } = require('child_process');
const fs = require('fs');

try {
  const host = core.getInput('HOST');
  const username = core.getInput('USERNAME');
  const privateKey = core.getInput('PRIVATE_KEY');
  const password = core.getInput('PASSWORD');
  const localPath = core.getInput('LOCAL_PATH');
  const files = core.getInput('FILES');
  const remotePath = core.getInput('REMOTE_PATH');
  const archiveFile = 'archiveFile.tar.gz';
  const keyPath = `id_temp_key`;
  const cleanRemote = core.getInput('cleanRemote').toLowerCase() === 'true';
  const port = core.getInput('port');

  console.log('⚙️ Begin Deploy')

  let scpCommand = '';
  let sshCommandBase = '';

  // Prepare port option for ssh/scp
  const sshPortOption = `-p ${port}`;
  const scpPortOption = `-P ${port}`

  if (privateKey) {
    fs.writeFileSync(keyPath, privateKey + '\n');
    fs.chmodSync(keyPath, 0o600);
    scpCommand = `scp -i ${keyPath} -o StrictHostKeyChecking=no ${scpPortOption}`;
    sshCommandBase = `ssh -i ${keyPath} -o StrictHostKeyChecking=no ${sshPortOption}`;
    console.log(`🔑 Using SSH key to deploy`)
  } else if (password) {
    scpCommand = `sshpass -p '${password}' scp -o StrictHostKeyChecking=no ${scpPortOption}`;
    sshCommandBase = `sshpass -p '${password}' ssh -o StrictHostKeyChecking=no ${sshPortOption}`;
    console.log(`🔑 Using password to deploy`)
  } else {
    throw new Error("Either privateKey or password must be provided");
  }

  let tarList = [];

  if(localPath) {
    if (!fs.existsSync(localPath)) {
      throw new Error(`Local path ${localPath} does not exist`);
    } else if (!fs.lstatSync(localPath).isDirectory()) {
      throw new Error(`Local path ${localPath} is not directory`);
    }
    tarList.push(`${localPath}/*`);
  }

  if(files) {
    files.split(',').forEach(file => {
      const trimmed = file.trim();
      tarList.push(trimmed);
    });
  }

  let tarFiles = tarList.join(' ');

  console.log(`🔧 Archiving ${tarFiles} into ${archiveFile}`);
  execSync(`tar -czf ${archiveFile} ${tarFiles} `, { stdio: 'inherit' });

  const prepareRemoteCmd = cleanRemote ? `mkdir -p ${remotePath} && rm -rf ${remotePath}/*` : `mkdir -p ${remotePath}`;

  console.log(`🧹 Preparing remote directory: ${remotePath}`);
  execSync(
    `${sshCommandBase} ${username}@${host} "${prepareRemoteCmd}"`,
    { stdio: 'inherit' }
  );

  console.log(`📦 Uploading ${archiveFile} to ${username}@${host}:${remotePath}`);
  execSync(
    `${scpCommand} ${archiveFile} ${username}@${host}:${remotePath}/`,
    { stdio: 'inherit' }
  );

  const sshExtractCmd = `cd ${remotePath} && tar -xzf ${archiveFile} && rm -f ${archiveFile}`;

  console.log(`📂 Extracting on remote and cleaning up...`);
  execSync(
    `${sshCommandBase} ${username}@${host} "${sshExtractCmd}"`,
    { stdio: 'inherit' }
  );

  fs.unlinkSync(archiveFile);

  console.log('✅ Deploy complete!');
} catch (error) {
  core.setFailed(`❌ Deployment failed: ${error.message}`);
}