import jenkins.model.Jenkins
import hudson.triggers.SCMTrigger
import org.jenkinsci.plugins.workflow.job.WorkflowJob
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition
import org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition
import hudson.plugins.git.GitSCM
import hudson.plugins.git.BranchSpec
import hudson.plugins.git.UserRemoteConfig
import com.cloudbees.plugins.credentials.CredentialsProvider
import com.cloudbees.plugins.credentials.CredentialsScope
import com.cloudbees.plugins.credentials.SystemCredentialsProvider
import com.cloudbees.plugins.credentials.common.StandardCredentials
import com.cloudbees.plugins.credentials.domains.Domain
import com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl
import org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl
import hudson.util.Secret

def envMap = [:]
new File('/tmp/aws-jenkins.env').eachLine { line ->
  def trimmed = line.replaceFirst(/^export\s+/, '').trim()
  def idx = trimmed.indexOf('=')
  if (idx > 0) {
    envMap[trimmed.substring(0, idx)] = trimmed.substring(idx + 1).replaceAll(/^"|"$/, '')
  }
}

def instance = Jenkins.instance
def store = SystemCredentialsProvider.instance.store
def domain = Domain.global()

CredentialsProvider.lookupCredentials(StandardCredentials, instance, null, null)
  .findAll { it.id in ['aws-access-key', 'aws-session-token'] }
  .each { store.removeCredentials(domain, it) }

store.addCredentials(domain, new UsernamePasswordCredentialsImpl(
  CredentialsScope.GLOBAL,
  'aws-access-key',
  'AWS access key for ec2test2 (Jenkinsfile)',
  envMap['AWS_ACCESS_KEY_ID'],
  envMap['AWS_SECRET_ACCESS_KEY']
))
store.addCredentials(domain, new StringCredentialsImpl(
  CredentialsScope.GLOBAL,
  'aws-session-token',
  'AWS session token for aws login (expires)',
  Secret.fromString(envMap['AWS_SESSION_TOKEN'] ?: '')
))

def pipelineScript = new File('/var/jenkins/repo/Jenkinsfile').text
def job = instance.getItem('ec2test2')
if (job == null) {
  job = instance.createProject(WorkflowJob, 'ec2test2')
}
job.definition = new CpsFlowDefinition(pipelineScript, true)
if (!job.triggers.keySet().any { it instanceof hudson.triggers.SCMTrigger.DescriptorImpl }) {
  job.addTrigger(new SCMTrigger('H/5 * * * *'))
}
job.save()
println 'configured job ec2test2 and credentials aws-access-key'
