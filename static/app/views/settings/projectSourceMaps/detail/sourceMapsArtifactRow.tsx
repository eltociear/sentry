import {Fragment} from 'react';
import styled from '@emotion/styled';

import Access from 'app/components/acl/access';
import Role from 'app/components/acl/role';
import Button from 'app/components/button';
import ButtonBar from 'app/components/buttonBar';
import Confirm from 'app/components/confirm';
import FileSize from 'app/components/fileSize';
import Tag from 'app/components/tag';
import TimeSince from 'app/components/timeSince';
import Tooltip from 'app/components/tooltip';
import {IconClock, IconDelete, IconDownload} from 'app/icons';
import {t} from 'app/locale';
import space from 'app/styles/space';
import {Artifact, ArtifactType} from 'app/types';

type Props = {
  artifact: Artifact;
  onDelete: (id: string) => void;
  downloadUrl: string;
  downloadRole: string;
};

const SourceMapsArtifactRow = ({
  artifact,
  onDelete,
  downloadUrl,
  downloadRole,
}: Props) => {
  const {name, size, dateCreated, id, dist, type} = artifact;

  const handleDeleteClick = () => {
    onDelete(id);
  };

  const getTypeTooltip = (tooltipType: ArtifactType) => {
    if (tooltipType === ArtifactType.INDIVIDUAL) {
      return t('This artifact has been uploaded individually.');
    }
    if (tooltipType === ArtifactType.ARCHIVED) {
      return t('This artifact is part of a zip archive.');
    }
    return undefined;
  };

  return (
    <Fragment>
      <NameColumn>
        <Name>{name || `(${t('empty')})`}</Name>
        <TimeAndDistWrapper>
          <TimeWrapper>
            <IconClock size="sm" />
            <TimeSince date={dateCreated} />
          </TimeWrapper>
          <StyledTag
            type={dist ? 'info' : undefined}
            tooltipText={dist ? undefined : t('No distribution set')}
          >
            {dist ?? t('none')}
          </StyledTag>
          {type && <StyledTag tooltipText={getTypeTooltip(type)}>{type}</StyledTag>}
        </TimeAndDistWrapper>
      </NameColumn>
      <SizeColumn>
        <FileSize bytes={size} />
      </SizeColumn>
      <ActionsColumn>
        <ButtonBar gap={0.5}>
          <Role role={downloadRole}>
            {({hasRole}) => (
              <Tooltip
                title={
                  !hasRole
                    ? t('You do not have permission to download artifacts.')
                    : type !== ArtifactType.INDIVIDUAL
                    ? t(
                        'This artifact is part of an archive. Only individual artifacts can be downloaded one by one.'
                      )
                    : t('Download Artifact')
                }
              >
                <Button
                  size="small"
                  icon={<IconDownload size="sm" />}
                  label={t('Download Artifact')}
                  disabled={!hasRole || type !== ArtifactType.INDIVIDUAL}
                  href={downloadUrl}
                />
              </Tooltip>
            )}
          </Role>

          <Access access={['project:releases']}>
            {({hasAccess}) => (
              <Tooltip
                title={
                  !hasAccess
                    ? t('You do not have permission to delete artifacts.')
                    : type !== ArtifactType.INDIVIDUAL
                    ? t(
                        'This artifact is part of an archive. Only individual artifacts can be removed one by one.'
                      )
                    : t('Remove Artifact')
                }
              >
                <Confirm
                  message={t('Are you sure you want to remove this artifact?')}
                  onConfirm={handleDeleteClick}
                  disabled={!hasAccess || type !== ArtifactType.INDIVIDUAL}
                >
                  <Button
                    size="small"
                    icon={<IconDelete size="sm" />}
                    label={t('Remove Artifact')}
                  />
                </Confirm>
              </Tooltip>
            )}
          </Access>
        </ButtonBar>
      </ActionsColumn>
    </Fragment>
  );
};

const NameColumn = styled('div')`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
`;

const SizeColumn = styled('div')`
  display: flex;
  justify-content: flex-end;
  text-align: right;
  align-items: center;
`;

const ActionsColumn = styled(SizeColumn)``;

const Name = styled('div')`
  padding-right: ${space(4)};
  overflow-wrap: break-word;
  word-break: break-all;
`;

const TimeAndDistWrapper = styled('div')`
  width: 100%;
  display: flex;
  margin-top: ${space(1)};
  align-items: center;
`;

const TimeWrapper = styled('div')`
  display: grid;
  grid-gap: ${space(0.5)};
  grid-template-columns: min-content 1fr;
  font-size: ${p => p.theme.fontSizeMedium};
  align-items: center;
  color: ${p => p.theme.subText};
`;

const StyledTag = styled(Tag)`
  margin-left: ${space(1)};
`;

export default SourceMapsArtifactRow;
