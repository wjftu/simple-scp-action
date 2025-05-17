const core = require('@actions/core');
const { execSync } = require('child_process');
const fs = require('fs');

try {
  const host = core.getInput('HOST');
  const username = core.getInput('USERNAME');
  const privateKey = core.getInput('PRIVATE_KEY');
  const password = core.getInput('PASSWORD');
  const localDir = core.getInput('LOCAL_DIR');
  const files = core.getInput('FILES');
  const remoteDir = core.getInput('REMOTE_DIR');
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

  let dirForScp = 'dir_for_scp';

  fs.mkdir(dirForScp, (err) => {
    if(err) {
      console.error(err);
    }
  });
  
  if(localDir) {
    execSync(`mv ${localDir}/* ${dirForScp}/`, { stdio: 'inherit' });
  }

  if(files) {
    files.split(',').forEach(file => {
      const trimmed = file.trim();
      execSync(`mv ${trimmed} ${dirForScp}/`, { stdio: 'inherit' });
    });
  }



  console.log(`🔧 Archiving files into ${archiveFile}`);
  execSync(`tar -czf ${archiveFile} -C ${dirForScp} .`, { stdio: 'inherit' });

  const prepareRemoteCmd = cleanRemote ? `mkdir -p ${remoteDir} && rm -rf ${remoteDir}/*` : `mkdir -p ${remoteDir}`;

  console.log(`🧹 Preparing remote directory: ${remoteDir}`);
  execSync(
    `${sshCommandBase} ${username}@${host} "${prepareRemoteCmd}"`,
    { stdio: 'inherit' }
  );

  console.log(`📦 Uploading ${archiveFile} to ${username}@${host}:${remoteDir}`);
  execSync(
    `${scpCommand} ${archiveFile} ${username}@${host}:${remoteDir}/`,
    { stdio: 'inherit' }
  );

  const sshExtractCmd = `cd ${remoteDir} && tar -xzf ${archiveFile} && rm -f ${archiveFile}`;

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