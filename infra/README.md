# ec2test2 environment

Jenkins creates or updates the AWS stack. GitHub Actions deploys the site and containers after a merge to `main`.

| Piece | Name |
|---|---|
| CloudFormation stacks | `ec2test2-cert` (`us-east-1`), `ec2test2` (`eu-north-1`) |
| Site URL | https://ec2test2.rinatschwartz770.xyz |
| Origin (Node `:3000`, FastAPI `:8000`) | `origin-ec2test2.rinatschwartz770.xyz` |

`infra/deploy-ec2test2.sh` is the only provisioner. It does not build the app or SSH to EC2.

## One-time local Jenkins

1. Start a controller if you do not already have one:

```bash
docker run -d --name jenkins -p 8080:8080 -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  jenkins/jenkins:lts
```

Open http://localhost:8080 and finish the unlock / plugin wizard. Install **Pipeline**.

If you want the job to run before `Jenkinsfile` is on `origin/main`, also mount this repo read-only as `/var/jenkins/repo` and skip the interactive wizard (`JAVA_OPTS=-Djenkins.install.runSetupWizard=false`). The local controller is already running that way at [http://localhost:8080/job/ec2test2](http://localhost:8080/job/ec2test2).

2. The Jenkins **agent that runs the job must have the AWS CLI**. On a Mac controller that is your machine (`aws` on `PATH`). Inside the official Jenkins image, install it on the agent or bind-mount a host `aws`.

3. Add credentials **Jenkins > Manage Credentials > Global**:

   - Kind: Username with password
   - ID: `aws-access-key` (must match the `Jenkinsfile`)
   - Username: AWS access key id
   - Password: AWS secret access key
   - Also add Secret text `aws-session-token` if you use `aws login` (temporary keys expire; refresh this credential after re-login)

   The identity needs CloudFormation, EC2, S3, CloudFront, ACM, and Route 53 in this project.

4. New item > Pipeline > Pipeline script from SCM:

   - SCM: Git
   - Repository URL: https://github.com/reginaschwartz/regins-website.git
   - Branch: `*/main`
   - Script path: `Jenkinsfile`

5. Build Triggers: **Poll SCM** `H/5 * * * *` (local Jenkins cannot receive GitHub webhooks unless you expose it). You can also click **Build Now**.

6. Run the job once **before** you rely on `.github/workflows/deploy-ec2test2-app.yml`. That workflow skips if stack `ec2test2` is missing.

## Manual run without Jenkins

```bash
export AWS_PROFILE=agent-toolkit   # or set AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
./infra/deploy-ec2test2.sh
```

Optional overrides: `CERTIFICATE_ARN`, `HOSTED_ZONE_ID`, `KEY_NAME`, `INSTANCE_TYPE`, `STACK_NAME`.

## After the stack exists

A merge to `main` still updates **testec2** via the existing workflows. `deploy-ec2test2-app.yml` then syncs `dist/webapp` to the new bucket and `docker-compose -f docker-compose.ec2.yml` on the new Elastic IP (template backend; t3.micro cannot load Qwen).
