pipeline {

    agent {
        label 'jenkins-node-02'
    }
   
    environment {
        NAMESPACE = 'millimekan'
        DOCKER_EMAIL = 'admin@mmdev.az'
        DOCKER_USER = 'admin'
        DOCKER_PASS = 'ESpcDUkFkENm'
        DOCKER_REGISTRY = 'registry.mmdev.az'
        DOCKER_IMAGE_TAG = "registry.mmdev.az/millimekan/pipeline-ui:${env.BUILD_NUMBER}"
        KUBECONFIG = '/home/jenkins/.kube/config'
    }
    
    stages {

        stage('Checkout') {
            steps {
                checkout scm
                script {
                    echo "Building branch: ${env.BRANCH_NAME}"
                    echo "Namespace: ${NAMESPACE}"
                    echo "Jenkins Node: ${env.NODE_NAME}"
                }
            }
        }

        stage('Build and Push Docker Image') {
            steps {
                script {
                    sh '''
                        echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin $DOCKER_REGISTRY
                        docker build -f ./Dockerfile -t $DOCKER_IMAGE_TAG .
                        docker push $DOCKER_IMAGE_TAG
                        docker image rm $DOCKER_IMAGE_TAG
                    '''
                }
            }
        }
        
        stage('Verify Kubernetes Connection') {
            steps {
                script {
                    sh """
                        echo "Testing kubectl connection..."
                        kubectl cluster-info
                        kubectl version --client
                    """
                }
            }
        }
        
        stage('Create Namespaces') {
            steps {
                script {
                    sh """
                        echo "Creating PipelineUI namespace ..."
                        kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f - --validate=false   
                        echo "Namespaces created or already exist"
                    """
                }
            }
        }
        
        stage('Create PipelineUI Resources') {
            steps {
                script {
                    sh """
                        echo "Creating PipelineUI ServiceAccount..."
                        kubectl create serviceaccount pipeline-ui -n ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
                        
                        echo "Creating PipelineUI RBAC..."
                        cat ./k8s/service-account.yml | envsubst | kubectl apply -f -
                        
                        echo "Creating Harbor registry secret..."
                        kubectl create secret docker-registry harbor-registry-secret \
                          --docker-server=${DOCKER_REGISTRY} \
                          --docker-username=${DOCKER_USER} \
                          --docker-password=${DOCKER_PASS} \
                          --docker-email=${DOCKER_EMAIL} \
                          -n ${NAMESPACE} \
                          --dry-run=client -o yaml | kubectl apply -f -
                        
                        echo "PipelineUI resources created"
                    """
                }
            }
        }
        
        stage('Deploy PipelineUI') {
            steps {
                script {
                    sh """
                        echo "Deploying PipelineUI ..."
                        
                        if [ ! -f "k8s/deployment.yml" ]; then
                            echo "Error: deployment.yml not found!"
                            exit 1
                        fi
                        
                        cat ./k8s/deployment.yml | envsubst | kubectl apply -f -
                        kubectl rollout history deployment -n ${NAMESPACE} pipeline-ui || true

                        echo "PipelineUI deployment completed"
                    """
                }
            }
        }
        
        stage('Verify Deployment') {
            steps {
                script {
                    sh """
                        echo ""
                        echo "===== PipelineUI Resources in ${NAMESPACE} ====="
                        kubectl get serviceaccount,secret,deployment -n ${NAMESPACE}

                        sleep 5
                        
                        echo ""
                        echo "===== PipelineUI API Logs (last 20 lines) ====="
                        kubectl logs -n ${NAMESPACE} deployment/pipeline-ui --tail=20 || echo "PipelineUI API not ready yet"
                    """
                }
            }
        }
        
        stage('Display Access Information') {
            steps {
                script {
                    echo """
                        ========================================
                        DEPLOYMENT SUCCESSFUL
                        ========================================

                        Branch: ${env.BRANCH_NAME}
                        Namespace: ${NAMESPACE}

                        Check status:
                        kubectl get all -n ${NAMESPACE}
                        kubectl get authapplications -n ${NAMESPACE}

                        ========================================
                    """
                }
            }
        }
    }
    
    post {
        success {
            echo "Pipeline completed successfully: ${env.BRANCH_NAME}"
        }
        failure {
            echo "Pipeline failed: ${env.BRANCH_NAME}"
            sh """
                echo "===== Debug Information ====="
                kubectl get pods -n ${NAMESPACE} || true
                kubectl get pods -n ${NAMESPACE} || true
                kubectl get events -n ${NAMESPACE} --sort-by='.lastTimestamp' | tail -20 || true
                kubectl get events -n ${NAMESPACE} --sort-by='.lastTimestamp' | tail -20 || true
            """
        }
        always {
            echo "Pipeline execution completed at: ${new Date()}"
        }
    }
}